use std::hash::pedersen_hash;

fn main() -> pub Field {
    let secret = 150000 as Field;
    pedersen_hash([secret])
}
