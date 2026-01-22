const { BarretenbergBackend } = require('@noir-lang/backend_barretenberg');
const { Noir } = require('@noir-lang/noir_js');
const circuit = require('./target/aegis_policy.json');

const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit, backend);

console.log("Noir methods:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(noir)));
console.log("\nBackend methods:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(backend)));
