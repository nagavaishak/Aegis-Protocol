// Aegis Protocol ZK Circuit
// Proves: "I know a private value x such that hash(x) == commitment AND x >= threshold"
// Built with Noir (Aztec) for Solana Privacy

use std::hash::pedersen_hash;

fn main(
    // Private inputs (never revealed)
    secret_value: Field,
    
    // Public inputs (on-chain data)
    commitment: pub Field,
    threshold: pub u64
) {
    // Constraint 1: Verify the secret matches the on-chain commitment
    let computed_hash = pedersen_hash([secret_value]);
    assert(computed_hash == commitment);
    
    // Constraint 2: Verify the secret value meets the minimum threshold
    let secret_as_u64 = secret_value as u64;
    assert(secret_as_u64 >= threshold);
}
