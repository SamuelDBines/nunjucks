1. IR / Bytecode + VM

Step A: compile AST → IR instructions

## instruction set:

- TEXT "hello"
- EVAL exprId
- FILTER "title" argc
- JUMP_IF_FALSE label
- JUMP label
- PUSH_FRAME / POP_FRAME
- SET name
- LOOKUP name
- CALL name argc
- BLOCK_CALL "content"
- EXTENDS "base.html"

Why this is best long-term

- Portability: implement VM in Go/Rust/Python, reuse compiler front-end .
- Debugging: IR is structured; you can add trace mode.
- Performance: often faster than AST interpretation because you avoid lots of virtual dispatch and recursion.
