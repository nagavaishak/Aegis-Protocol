use arcis::*;

#[encrypted]
mod aegis_circuits {
    use arcis::*;

    pub struct AccessInput {
        pub amount: u64,
    }

    #[instruction]
    pub fn verify_access(
        mxe: Mxe,
        input_ctxt: Enc<Shared, AccessInput>,
        threshold: u64,
    ) -> Enc<Mxe, bool> {
        let input = input_ctxt.to_arcis();
        let approved = input.amount >= threshold;
        mxe.from_arcis(approved)
    }
}
