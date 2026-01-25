use anchor_lang::prelude::*;

declare_id!("J4qkfpNjTBHwW5eNSeAEKTB6wYVPSjAo3fVZcC93bSCE");

/// Aegis Protocol: Secrets-as-a-Service Infrastructure for Autonomous Systems
/// 
/// INTEGRATION: Arcium Confidential Computing
/// Aegis acts as an authorization layer that binds Arcium MPC computations
/// to on-chain certificates. Policy verification happens off-chain in Arcium's
/// confidential compute environment, with results anchored on Solana.

#[program]
pub mod aegis_protocol {
    use super::*;

    /// Create a confidential access policy
    pub fn create_rule(
        ctx: Context<CreateRule>,
        dataset_id: [u8; 32],
        secret_commitment: [u8; 32],
        policy_threshold: u64,
        allowed_identity_hashes: Vec<[u8; 32]>,
        valid_from: i64,
        valid_until: i64,
    ) -> Result<()> {
        require!(
            allowed_identity_hashes.len() <= 10,
            ErrorCode::TooManyIdentities
        );
        require!(policy_threshold > 0, ErrorCode::InvalidThreshold);
        require!(valid_until > valid_from, ErrorCode::InvalidTimeRange);

        let rule = &mut ctx.accounts.access_rule;
        rule.dataset_id = dataset_id;
        rule.secret_commitment = secret_commitment;
        rule.policy_threshold = policy_threshold;
        rule.allowed_identity_hashes = allowed_identity_hashes;
        rule.valid_from = valid_from;
        rule.valid_until = valid_until;
        rule.owner = ctx.accounts.owner.key();
        rule.is_active = true;
        rule.is_paused = false;
        rule.bump = ctx.bumps.access_rule;

        emit!(RuleCreated {
            rule_address: rule.key(),
            dataset_id,
            owner: ctx.accounts.owner.key(),
            policy_threshold,
            identity_count: rule.allowed_identity_hashes.len() as u8,
        });

        Ok(())
    }

    /// Request access with Arcium confidential verification proof
    /// 
    /// NEW: Requires arcium_job_id and computation_hash from MPC verification
    pub fn request_access_with_arcium(
        ctx: Context<RequestAccess>,
        arcium_job_id: String,
        arcium_computation_hash: String,
        data_value: u64,
        identity_hash: [u8; 32],
    ) -> Result<()> {
        let rule = &ctx.accounts.access_rule;
        let clock = Clock::get()?;

        // Validate Arcium proof format
        require!(arcium_job_id.len() > 0, ErrorCode::InvalidArciumJobId);
        require!(arcium_computation_hash.len() > 0, ErrorCode::InvalidComputationHash);

        // Check rule is active and not paused
        require!(rule.is_active, ErrorCode::RuleNotActive);
        require!(!rule.is_paused, ErrorCode::RulePaused);

        // Check time bounds
        require!(
            clock.unix_timestamp >= rule.valid_from,
            ErrorCode::RuleNotYetValid
        );
        require!(
            clock.unix_timestamp <= rule.valid_until,
            ErrorCode::RuleExpired
        );

        // Issue access certificate with Arcium proof
        let cert = &mut ctx.accounts.certificate;
        cert.dataset_id = rule.dataset_id;
        cert.rule_address = rule.key();
        cert.requester = ctx.accounts.requester.key();
        cert.valid_until = clock.unix_timestamp + 3600; // 1 hour validity
        cert.is_used = false;
        cert.arcium_job_id = arcium_job_id.clone();
        cert.arcium_computation_hash = arcium_computation_hash.clone();
        cert.bump = ctx.bumps.certificate;

        emit!(AccessGrantedWithArcium {
            certificate_address: cert.key(),
            rule_address: rule.key(),
            dataset_id: rule.dataset_id,
            requester: ctx.accounts.requester.key(),
            data_value,
            identity_hash,
            arcium_job_id,
            arcium_computation_hash,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Legacy request_access (kept for backwards compatibility)
    pub fn request_access(
        ctx: Context<RequestAccess>,
        secret: [u8; 32],
        data_value: u64,
        identity_hash: [u8; 32],
    ) -> Result<()> {
        let rule = &ctx.accounts.access_rule;
        let clock = Clock::get()?;

        require!(rule.is_active, ErrorCode::RuleNotActive);
        require!(!rule.is_paused, ErrorCode::RulePaused);
        require!(clock.unix_timestamp >= rule.valid_from, ErrorCode::RuleNotYetValid);
        require!(clock.unix_timestamp <= rule.valid_until, ErrorCode::RuleExpired);
        require!(secret == rule.secret_commitment, ErrorCode::InvalidSecret);
        require!(data_value >= rule.policy_threshold, ErrorCode::InsufficientValue);
        require!(rule.allowed_identity_hashes.contains(&identity_hash), ErrorCode::IdentityNotApproved);

        let cert = &mut ctx.accounts.certificate;
        cert.dataset_id = rule.dataset_id;
        cert.rule_address = rule.key();
        cert.requester = ctx.accounts.requester.key();
        cert.valid_until = clock.unix_timestamp + 3600;
        cert.is_used = false;
        cert.arcium_job_id = String::from("legacy");
        cert.arcium_computation_hash = String::from("n/a");
        cert.bump = ctx.bumps.certificate;

        emit!(AccessGranted {
            certificate_address: cert.key(),
            rule_address: rule.key(),
            dataset_id: rule.dataset_id,
            requester: ctx.accounts.requester.key(),
            data_value,
            identity_hash,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn use_certificate(
        ctx: Context<UseCertificate>,
        action_result: bool,
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        let clock = Clock::get()?;

        require!(!cert.is_used, ErrorCode::CertificateAlreadyUsed);
        require!(clock.unix_timestamp <= cert.valid_until, ErrorCode::CertificateExpired);
        require!(cert.requester == ctx.accounts.user.key(), ErrorCode::UnauthorizedUser);

        cert.is_used = true;

        emit!(CertificateUsed {
            certificate_address: cert.key(),
            action_result,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn revoke_rule(ctx: Context<RevokeRule>) -> Result<()> {
        let rule = &mut ctx.accounts.access_rule;
        require!(rule.owner == ctx.accounts.owner.key(), ErrorCode::UnauthorizedOwner);
        require!(rule.is_active, ErrorCode::RuleAlreadyInactive);
        rule.is_active = false;
        emit!(RuleRevoked { rule_address: rule.key(), timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn pause_rule(ctx: Context<PauseRule>) -> Result<()> {
        let rule = &mut ctx.accounts.access_rule;
        require!(rule.owner == ctx.accounts.owner.key(), ErrorCode::UnauthorizedOwner);
        require!(rule.is_active, ErrorCode::RuleNotActive);
        require!(!rule.is_paused, ErrorCode::RuleAlreadyPaused);
        rule.is_paused = true;
        emit!(RulePaused { rule_address: rule.key(), timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn resume_rule(ctx: Context<ResumeRule>) -> Result<()> {
        let rule = &mut ctx.accounts.access_rule;
        require!(rule.owner == ctx.accounts.owner.key(), ErrorCode::UnauthorizedOwner);
        require!(rule.is_active, ErrorCode::RuleNotActive);
        require!(rule.is_paused, ErrorCode::RuleNotPaused);
        rule.is_paused = false;
        emit!(RuleResumed { rule_address: rule.key(), timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }
}

#[account]
pub struct AccessRule {
    pub dataset_id: [u8; 32],
    pub secret_commitment: [u8; 32],
    pub policy_threshold: u64,
    pub allowed_identity_hashes: Vec<[u8; 32]>,
    pub valid_from: i64,
    pub valid_until: i64,
    pub owner: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub bump: u8,
}

impl AccessRule {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 324 + 8 + 8 + 32 + 1 + 1 + 1;
}

#[account]
pub struct AccessCertificate {
    pub dataset_id: [u8; 32],
    pub rule_address: Pubkey,
    pub requester: Pubkey,
    pub valid_until: i64,
    pub is_used: bool,
    pub arcium_job_id: String,          // NEW: Arcium MPC computation ID
    pub arcium_computation_hash: String, // NEW: Hash binding certificate to MPC result
    pub bump: u8,
}

impl AccessCertificate {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 32 + 8 + 1 + (4 + 64) + (4 + 64) + 1; // Added space for strings
}

#[derive(Accounts)]
#[instruction(dataset_id: [u8; 32])]
pub struct CreateRule<'info> {
    #[account(init, payer = owner, space = AccessRule::MAX_SIZE, seeds = [b"rule", dataset_id.as_ref()], bump)]
    pub access_rule: Account<'info, AccessRule>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestAccess<'info> {
    #[account(mut)]
    pub access_rule: Account<'info, AccessRule>,
    #[account(init, payer = requester, space = AccessCertificate::MAX_SIZE, seeds = [b"certificate", access_rule.key().as_ref(), requester.key().as_ref()], bump)]
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

#[derive(Accounts)]
pub struct PauseRule<'info> {
    #[account(mut)]
    pub access_rule: Account<'info, AccessRule>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResumeRule<'info> {
    #[account(mut)]
    pub access_rule: Account<'info, AccessRule>,
    pub owner: Signer<'info>,
}

#[event]
pub struct RuleCreated {
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub owner: Pubkey,
    pub policy_threshold: u64,
    pub identity_count: u8,
}

#[event]
pub struct AccessGranted {
    pub certificate_address: Pubkey,
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub requester: Pubkey,
    pub data_value: u64,
    pub identity_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct AccessGrantedWithArcium {
    pub certificate_address: Pubkey,
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub requester: Pubkey,
    pub data_value: u64,
    pub identity_hash: [u8; 32],
    pub arcium_job_id: String,
    pub arcium_computation_hash: String,
    pub timestamp: i64,
}

#[event]
pub struct AccessDenied {
    pub rule_address: Pubkey,
    pub dataset_id: [u8; 32],
    pub requester: Pubkey,
    pub denial_reason: String,
    pub timestamp: i64,
}

#[event]
pub struct CertificateUsed {
    pub certificate_address: Pubkey,
    pub action_result: bool,
    pub timestamp: i64,
}

#[event]
pub struct RuleRevoked { pub rule_address: Pubkey, pub timestamp: i64 }
#[event]
pub struct RulePaused { pub rule_address: Pubkey, pub timestamp: i64 }
#[event]
pub struct RuleResumed { pub rule_address: Pubkey, pub timestamp: i64 }

#[error_code]
pub enum ErrorCode {
    #[msg("Too many approved identities (max 10)")]
    TooManyIdentities,
    #[msg("Invalid threshold (must be > 0)")]
    InvalidThreshold,
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
    #[msg("Data value below policy threshold")]
    InsufficientValue,
    #[msg("Identity not in approved list")]
    IdentityNotApproved,
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
    #[msg("Rule already active")]
    RuleAlreadyActive,
    #[msg("Rule is paused")]
    RulePaused,
    #[msg("Rule already paused")]
    RuleAlreadyPaused,
    #[msg("Rule is not paused")]
    RuleNotPaused,
    #[msg("Invalid Arcium job ID")]
    InvalidArciumJobId,
    #[msg("Invalid computation hash")]
    InvalidComputationHash,
}
