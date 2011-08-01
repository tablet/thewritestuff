# thewritestuff.js
Authors: Matthew Story <matt@tablethotels.com>
Version: 0.9 (stable, but not sane)
License: [BSD](https://github.com/tablet/thewritestuff/blob/0.9/LICENSE
Copyright: &copy; 2011, [Tablet, Inc](http://www.tablethotels.com)

### Why?

Widget developers are a rather inconsiderate lot.  They do fun things like 
... say ... ask you to drop script tags the use 'document.write' to do things
like .... say ... recursively drop script tags that also use 'document.write'.
All of this pretty much adds up to your pages, becoming severely un-fast, 
severely unreliable and severely unflexible.

### Yes, but that's the way it is ... 

About 2 years ago, we got pretty frustrated hearing ourselves apologize for the
mistakes of inconsiderate developers, and decided to solve the problem outright.

The result is thewritestuff.js, which overrides the document.write method on
page load.

### You Monkey-Patch document.write?!

Yes, on the window onLoad event, at which point the document.write method is
non-operable.  So, this doesn't break any existing functionality, in any 
browser.  It merely allows you to render code with document.write in it
post page load.

### How To Use thewritestuff

TODO: Example

### Yes, but this is hideous code ...

We agree!  Please help us make it better by forking it.  If we all stand 
together, we can make inconsiderate widgetists irrelivant through 
spectacular feats of frustation-driven will.

### Footprint

thewritestuff.js sets 2 attributes on the window object (e.g. global namespace):

Writes (helper object, keeps track of the progress of your recursive writes)
Write (class constructor, instantiated by document.write post-page load)

### Dependecies

None.  We don't like the thought of having to use 160K+ of "core utilities" to
get something simple working, and we didn't think you'd like that either.
