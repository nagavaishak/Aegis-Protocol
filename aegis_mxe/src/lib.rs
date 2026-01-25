use arcis::*;

#[encrypted]
mod aegis_circuits {
    use arcis::*;

    /// Private input for access verification
    pub struct AccessInput {
        secret_amount: u64,
    }

    /// Policy parameters (public)
    pub struct PolicyParams {
        threshold: u64,
    }

    /// Result of access verification
    pub struct AccessResult {
        approved: bool,
    }

    /// Verifies if secret amount meets policy threshold
    /// 
    /// This computation runs confidentially - the secret_amount
    /// is never revealed, only the approval decision is returned.
    ///
    /// # Arguments
    /// * `input_ctxt` - Encrypted secret amount
    /// * `params` - Public policy threshold
    ///
    /// # Returns
    /// Encrypted boolean indicating approval status
    #[instruction]
    pub fn verify_access(
        mxe: Mxe,
        input_ctxt: Enc<Shared, AccessInput>,
        params: PolicyParams,
    ) -> Enc<Mxe, AccessResult> {
        let input = input_ctxt.to_arcis();
        
        let approved = input.secret_amount >= params.threshold;
        
        let result = AccessResult { approved };
        mxe.from_arcis(result)
    }
}
