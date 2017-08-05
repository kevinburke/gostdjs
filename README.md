# Go Stdlib in JS

This is an attempt to implement useful features of the Go standard library in
Javascript.

This is written in plain Javascript and doesn't have any dependencies so you
should be able to run it in lots of places.

### Types

We check types on the inputs to a function and always try to return the correct
types from a function.

Go strings are JS strings, except JS strings are assumed to be encoded as
UTF-16, which means that the encoding behavior needs to change in some
circumstances.

Functions that take a rune in Go take an integer in Javascript.

### Running the tests

Run `make test`. The tests use the most recent versions of `mocha` and `should`.

### Installation

Copy the source code directly to your project. You should inspect the source
of the project and see if it makes sense for you. You may only need a single
method, in which case you should just copy that into your source tree directly.

Installation via NPM encourages bloat and discourages people from inspecting the
source code to see if the tool a) does what they want and b) does not do what
they don't want.

I will tag new releases via Git, along with a change log, and you can use Git
and the Github compare tool to diff changes between releases.

### Performance

For now performance is a secondary goal to correctness. A lot of the
optimizations present in the Go standard library around e.g. short vs long
strings are missing here.
