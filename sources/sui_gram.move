/// Module: sui_gram
module sui_gram::sui_gram {
use sui::object::{Self, UID};
use std::string;
use sui::tx_context::{Self, TxContext};
use sui::transfer;
use sui::address;

public struct Meme has key, store {
    id: UID,
    link: string::String,
    owner_name: string::String
    vote_count: u64,
  }
    fun new(link: string::String owner_name: string::String, ctx: &mut TxContext): Meme {
       const VOTE_COUNT: u64 = 0
  Meme {
    id: object::new(ctx),
    link: link,
    vote_count: VOTE_COUNT,
    owner_name: owner_name
  }
}
public entry fun create_new_meme(link: string::String, owner_name: string::String, vote_count, ctx: &mut TxContext) {
  let new_meme = new(link, owner_name,vote_count, ctx);
  transfer::transfer(new_meme, tx_context::sender(ctx));
}
}
