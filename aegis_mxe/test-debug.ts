import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AegisMxeDeploy } from "./target/types/aegis_mxe_deploy";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.AegisMxeDeploy as Program<AegisMxeDeploy>;

console.log("Available methods:");
console.log(Object.keys(program.methods));
