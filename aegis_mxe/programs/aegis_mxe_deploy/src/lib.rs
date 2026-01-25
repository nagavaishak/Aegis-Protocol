use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

const COMP_DEF_OFFSET_VERIFY_ACCESS: u32 = comp_def_offset("verify_access");

declare_id!("3eRnGDsu7CA4zxStmGjqTBjc6Ajye4Vnt7MDC5C4VrZe");

#[arcium_program]
pub mod aegis_mxe_deploy {
    use super::*;

    pub fn init_verify_access_comp_def(ctx: Context<InitVerifyAccessCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn verify_access(
        ctx: Context<VerifyAccess>,
        computation_offset: u64,
        encrypted_amount: [u8; 32],
        threshold: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        
        // CORRECT ORDER: Match flattened circuit signature
        // Circuit: verify_access(mxe, pubkey, enc_nonce, encrypted_amount, threshold, nonce)
        // But ArgBuilder needs: nonce FIRST, then pubkey, enc_nonce, encrypted_u64, threshold
        let args = ArgBuilder::new()
            .plaintext_u128(nonce)           // Overall computation nonce
            .x25519_pubkey(pubkey)           // Encryption pubkey
            .plaintext_u128(nonce)           // Encryption nonce (same as computation nonce)
            .encrypted_u64(encrypted_amount) // The encrypted amount
            .plaintext_u64(threshold)        // The threshold to check against
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![VerifyAccessCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[]
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "verify_access")]
    pub fn verify_access_callback(
        ctx: Context<VerifyAccessCallback>,
        output: SignedComputationOutputs<VerifyAccessOutput>,
    ) -> Result<()> {
        let _result = output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        )?;
        msg!("✅ MXE callback received - access verified!");
        Ok(())
    }
}

#[queue_computation_accounts("verify_access", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct VerifyAccess<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_ACCESS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS,
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("verify_access")]
#[derive(Accounts)]
pub struct VerifyAccessCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_ACCESS)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("verify_access", payer)]
#[derive(Accounts)]
pub struct InitVerifyAccessCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Cluster not set")]
    ClusterNotSet,
}
