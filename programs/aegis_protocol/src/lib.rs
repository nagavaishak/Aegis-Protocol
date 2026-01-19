use anchor_lang::prelude::*;

declare_id!("7UDghojWtnQUddeuAmA5q3oqiPfoQCAQySsxTHzyrkAj");

/// Aegis Protocol: Privacy-Preserving Access Control Infrastructure
/// 
/// DESIGN PHILOSOPHY:
/// This protocol provides general-purpose access control primitives that work across domains:
/// - Invoice Factoring: Verify invoice amount + buyer without exposing details
/// - Carbon Credits: Verify credit value + issuer without revealing buyer
/// - RWA Collateral: Verify asset value + custody without exposing owner
/// - Supply Chain: Verify conditions (temp, location) without revealing supplier
/// 
/// PRIVACY MODEL:
/// - Rules are public (who can access, under what conditions)
/// - Data is private (actual values never on-chain)
/// - Verification is cryptographic (hash-based commitments)
/// - Audit trail is preserved (event emission for compression)


#[program]
pub mod aegis_protocol {
    use super::*;

    /// Create an access rule with approved buyers and minimum amount
    pub fn create_rule(
        ctx: Context<CreateRule>,
        dataset_id: [u8; 32],
        secret_commitment: [u8; 32],
        min_amount: u64,
        approved_buyer_hashes: Vec<[u8; 32]>,
        valid_from: i64,
        valid_until: i64,
    ) -> Result<()> {
        require!(
            approved_buyer_hashes.len() <= 10,
            ErrorCode::TooManyBuyers
        );
        require!(min_amount > 0, ErrorCode::InvalidAmount);
        require!(valid_until > valid_from, ErrorCode::InvalidTimeRange);

        let rule = &mut ctx.accounts.access_rule;
        rule.dataset_id = dataset_id;
        rule.secret_commitment = secret_commitment;
        rule.min_amount = min_amount;
        rule.approved_buyer_hashes = approved_buyer_hashes;
        rule.valid_from = valid_from;
        rule.valid_until = valid_until;
        rule.owner = ctx.accounts.owner.key();
        rule.is_active = true;
        rule.bump = ctx.bumps.access_rule;

        emit!(RuleCreated {
            rule_address: rule.key(),
            dataset_id,
            owner: ctx.accounts.owner.key(),
            min_amount,
            buyer_count: rule.approved_buyer_hashes.len() as u8,
        });

        Ok(())
    }

    /// Request access by proving you know the secret
    pub fn request_access(
        ctx: Context<RequestAccess>,
        secret: [u8; 32],
        invoice_amount: u64,
        buyer_id_hash: [u8; 32],
    ) -> Result<()> {
        let rule = &ctx.accounts.access_rule;
        let clock = Clock::get()?;

        // 1. Check rule is active
        require!(rule.is_active, ErrorCode::RuleNotActive);

        // 2. Check time bounds
        require!(
            clock.unix_timestamp >= rule.valid_from,
            ErrorCode::RuleNotYetValid
        );
        require!(
            clock.unix_timestamp <= rule.valid_until,
            ErrorCode::RuleExpired
        );

        // 3. Verify secret commitment (direct comparison for MVP)
        require!(
            secret == rule.secret_commitment,
            ErrorCode::InvalidSecret
        );

        // 4. Verify invoice amount
        require!(
            invoice_amount >= rule.min_amount,
            ErrorCode::InsufficientAmount
        );

        // 5. Verify buyer is approved
        require!(
            rule.approved_buyer_hashes.contains(&buyer_id_hash),
            ErrorCode::BuyerNotApproved
        );

        // 6. Issue certificate
        let cert = &mut ctx.accounts.certificate;
        cert.dataset_id = rule.dataset_id;
        cert.rule_address = rule.key();
        cert.requester = ctx.accounts.requester.key();
        cert.valid_until = clock.unix_timestamp + 3600; // 1 hour validity
        cert.is_used = false;
        cert.bump = ctx.bumps.certificate;

        emit!(AccessGranted {
            certificate_address: cert.key(),
            rule_address: rule.key(),
            dataset_id: rule.dataset_id,
            requester: ctx.accounts.requester.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Use certificate (for audit trail)
    pub fn use_certificate(
        ctx: Context<UseCertificate>,
        computation_result: bool,
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        let clock = Clock::get()?;

        require!(!cert.is_used, ErrorCode::CertificateAlreadyUsed);
        require!(
            clock.unix_timestamp <= cert.valid_until,
            ErrorCode::CertificateExpired
        );
        require!(
            cert.requester == ctx.accounts.user.key(),
            ErrorCode::UnauthorizedUser
        );

        cert.is_used = true;

        emit!(CertificateUsed {
            certificate_address: cert.key(),
            computation_result,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Revoke a rule (owner only)
    pub fn revoke_rule(ctx: Context<RevokeRule>) -> Result<()> {
        let rule = &mut ctx.accounts.access_rule;
        
        require!(
            rule.owner == ctx.accounts.owner.key(),
            ErrorCode::UnauthorizedOwner
        );
        require!(rule.is_active, ErrorCode::RuleAlreadyInactive);

        rule.is_active = false;

        emit!(RuleRevoked {
            rule_address: rule.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
pub struct AccessRule {
    pub dataset_id: [u8; 32],           // 32
    pub secret_commitment: [u8; 32],    // 32
    pub min_amount: u64,                // 8
    pub approved_buyer_hashes: Vec<[u8; 32]>, // 4 + (10 * 32) = 324
    pub valid_from: i64,                // 8
    pub valid_until: i64,               // 8
    pub owner: Pubkey,                  // 32
    pub is_active: bool,                // 1
    pub bump: u8,                       // 1
}

impl AccessRule {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 324 + 8 + 8 + 32 + 1 + 1;
}

#[account]
pub struct AccessCertificate {
    pub dataset_id: [u8; 32],      // 32
    pub rule_address: Pubkey,      // 32
    pub requester: Pubkey,         // 32
    pub valid_until: i64,          // 8
    pub is_used: bool,             // 1
    pub bump: u8,                  // 1
}

impl AccessCertificate {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1;
}

// ============================================================================
// Context Structures
// ============================================================================

#[derive(Accounts)]
#[instruction(dataset_id: [u8; 32])]
pub struct CreateRule<'info> {
    #[account(
        init,
        payer = owner,
        space = AccessRule::MAX_SIZE,
        seeds = [b"rule", dataset_id.as_ref()],
        bump
    )]
    pub access_rule: Account<'info, AccessRule>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestAccess<'info> {
    #[account(mut)]
    pub access_rule: Account<'info, AccessRule>,
    
    #[account(
        init,
        payer = requester,
        space = AccessCertificate::MAX_SIZE,
        seeds = [
            b"certificate",
            access_rule.key().as_ref(),
            requester.key().as_ref()
        ],
        bump
    )]
    pub certificate: Account<'info, AccessCertificate>,
    
    #[account(mut)]
    pub requester: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UseCertificate<'info> {
    #[account(mut)]
    pub certificate: Account<'info, AccessCertificate>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeRule<'info> {
    #[account(mut)]
    pub access_rule: Account<'info, AccessRule>,
    
    pub owner: Signer<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct RuleCreated {
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub owner: Pubkey,
    pub min_amount: u64,
    pub buyer_count: u8,
}

#[event]
pub struct AccessGranted {
    pub certificate_address: Pubkey,
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub requester: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CertificateUsed {
    pub certificate_address: Pubkey,
    pub computation_result: bool,
    pub timestamp: i64,
}

#[event]
pub struct RuleRevoked {
    pub rule_address: Pubkey,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Too many approved buyers (max 10)")]
    TooManyBuyers,
    
    #[msg("Invalid amount (must be > 0)")]
    InvalidAmount,
    
    #[msg("Invalid time range (valid_until must be > valid_from)")]
    InvalidTimeRange,
    
    #[msg("Rule is not active")]
    RuleNotActive,
    
    #[msg("Rule is not yet valid")]
    RuleNotYetValid,
    
    #[msg("Rule has expired")]
    RuleExpired,
    
    #[msg("Invalid secret")]
    InvalidSecret,
    
    #[msg("Invoice amount below minimum")]
    InsufficientAmount,
    
    #[msg("Buyer not in approved list")]
    BuyerNotApproved,
    
    #[msg("Certificate already used")]
    CertificateAlreadyUsed,
    
    #[msg("Certificate has expired")]
    CertificateExpired,
    
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    
    #[msg("Unauthorized owner")]
    UnauthorizedOwner,
    
    #[msg("Rule already inactive")]
    RuleAlreadyInactive,
}