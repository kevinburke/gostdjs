# Go Stdlib in JS

This is an attempt to implement useful features of the Go standard library in
Javascript.

This is written in plain Javascript and doesn't have any dependencies, so it
should be easy to add to your project.

```
const time = require('./gostdjs/time/index.js');

const longForm = "Jan 2, 2006 at 3:04pm (MST)";
var t = time.parse(longForm, "Feb 3, 2013 at 7:54pm (PST)");
var u = t.sub(time.Hour);
console.log(u.toString());
```

### Types

We check types on the inputs to a function and always try to return the correct
types from a function.

Go strings are JS strings, except JS strings are assumed to be encoded as
UTF-16, which means that the encoding behavior needs to change in some
circumstances.

Functions that take a rune in Go take an integer in Javascript.

We use custom `int64` and `uint64` types due to Javascript's lack of precision
for these integers. Several functions return them, for example a `time.Duration`
stores an int64 internally. The downside is that normal math operators - `-`,
`+`, `*`, `/`, don't work with these types. Instead you have to use custom
operators:

- `add` - add another Int64/Uint64.
- `addn` - add an integer
- `sub` - sub another Int64/Uint64
- `subn` - sub another integer
- `mul`/`muln` - multiplication
- `mod`/`modn` - modulo arithmetic
- `lt`/`ltn` - less than
- `lte`/`lten` - less than or equal to
- `eq`/`eqn` - equal to
- `gt`/`gtn` - greater than
- `gte`/`gten` - greater than or equal to

Each of these will throw if you pass an object that has the wrong type, e.g if
you pass an Int64 object to `addn`. This should help you verify that your code
is doing the thing you expect it to, and failing when it does something you
don't expect it to.

`time.Duration` objects support all of these functions. If a Go function
accepts an int64 or a uint64, those should be converted to the equivalent
`Int64`/`Uint64` objects before using this library. If a Go function accepts an
`int`, we use normal Javascript numbers.

`Int64` objects can only do operations with other `Int64` objects. To convert
a `Uint64` to an `Int64`, call `toSigned()`, and call `.toUnsigned()` in the
opposite direction.

### Installation

Copy the source code directly to your project. You should inspect the source
of the project and see if it makes sense for you. You may only need a single
method, in which case you should just copy that into your source tree directly.

To require a module, require the `index.js` file in the package. So to import
the `time` package:

```
const time = require('./gostdjs/time/index.js');
```

Installation via NPM encourages bloat and discourages people from inspecting the
source code to see if the tool a) does what they want and b) does not do what
they don't want. If this makes it harder for you to install - good! It should be
more expensive in time and effort to install third party packages.

I will tag new releases via Git, along with a change log, and you can use Git
and the Github compare tool to diff changes between releases.

### Performance

For now performance is a secondary goal to correctness. A lot of the
optimizations present in the Go standard library around e.g. short vs long
strings are missing here.

### Developing

#### Errors

Functions that don't use I/O and return an error as the last parameter should
instead throw an error. Use `internal.throwSystem` in catch handlers to
distinguish between system errors (type and syntax errors) and user errors.

#### Strings/Runes

To convert between strings and their ASCII character equivalents, do
`'a'.charCodeAt(0)`. Unfortunately you can't do math between `uint8` types and
bytes. To get a Unicode code point at a character, do `'uchar'.codePointAt(0)`,
which may yield a number larger than 256.

### Running the tests

Run `make test`. The tests use the most recent versions of `mocha` and `should`,
as well as `eslint` for validation.

To convert tests from Go to Javascript, switch something like this:

```go
if d1 != d2 {
    t.Errorf("%d != %d", d1, d2)
}
```

to:

```go
d1.should.equal(d2, util.format("%d != %d", d1, d2))
```

Note util.format does not line up exactly with fmt.Printf parameters, so you
might need to massage it a little bit.
