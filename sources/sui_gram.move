/*
/// Module: sui_gram
module sui_gram::sui_gram {
use sui::object::{Self, UID};
use std::string;
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::address;

public struct Meme has key, store, drop {
    id: UID,
    link: string::String,
    owner_name: string::String
    vote_count: u64,
  }
    fun new(owner_name: string::String, ctx: &mut TxContext): Meme {
       const VOTE_COUNT: u64 = 0
  Meme {
    id: object::new(ctx),
    vote_count: VOTE_COUNT,
    owner_name: owner_name
  }
}
}
*/
