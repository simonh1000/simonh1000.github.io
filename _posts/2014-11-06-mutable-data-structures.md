---
title: Monads and mutable data structures
layout: post
category: haskell
---

I'm following the Stanford Algorithms MOOC and trying to implement the problems using Haskell. Many of the algorithms require quite a bit of data juggling, and my pure solutions are running way slower than benchmarks people are quoting for imperative languages. This is due to expensive copying and appending.

So I wanted to explore mutable data structures, which took me into the world of Monads. This page benefits from the advice I received to this and other [Stack Overflow posts](http://stackoverflow.com/questions/26571225/mutability-directly-or-via-st-monad).

QuickSort is an archetypal example of an algorithm using mutability, and will form the basis of the following examples.

## ST Monad with mutable array

Consider the following:

{% highlight hs %}
	qsort :: (STArray s Int Int) -> Int -> Int -> ST s ()
	qsort arr min mx =
		if mx - min < 1 then
			return ()

		else do
			p <- readArray arr min
			final_i <- foldM (partitioner p) (min+1) [(min+1)..mx]
			swap min $ final_i - 1
			qsort arr min     (final_i-2)
			qsort arr final_i mx

		where
			swap i j = do
				arr_i <- readArray arr i
				arr_j <- readArray arr j
				writeArray arr i arr_j
				writeArray arr j arr_i

			partitioner p i idx = do
				arr_idx <- readArray arr idx
				if arr_idx > p then
					return i
				else do
					swap i idx
					return $ i+1

	main = do
		let
			inputData = [3,1,5,4,2]
	{-
		print $ elems $ runSTArray $ do
			--newListArray :: (MArray a e m, Ix i) => (i, i) -> [e] -> m (a i e)
			state <- newListArray (1, length inputData) inputData
			qsort state 1 (length inputData)
			return state
	-}
		print $ elems $ runST $ do
			--newListArray :: (MArray a e m, Ix i) => (i, i) -> [e] -> m (a i e)
			state <- newListArray (1, length inputData) inputData
			qsort state 1 (length inputData)
			frozen <- freeze state
			return frozen
{% endhighlight %}

Starting from main, note how we wrap the main instructions in `runST` or `runSTArray`. `runST` is the more generally useful code, and it needs to be provided with a 'pure' value to work. So I freeze the mutable state (in this case an Array) and return, and print, that. `runSTArray` is special syntax which has the same effect for mutable arrays.

Qsort itself takes the relevant mutable array, undertakes a succession of recursive partitions of the data, and ultimately stops. It does not return anything, but of course leaves the state considerably changed, hence the return type of `State s ()`.

Note how `foldM` works exactly as `foldl`, but that it returns a Monad, so I extract the value from it for later use.

### IO Monad

Another approach is to use the IO Monad, again with an Array as an example.  This is simpler to write and, in particular, avoids the complexity of understanding runST. I believe ST provides more checks of some sort, so that might make it preferable.

{% highlight hs %}
	main = do
	    [snip]
	    arr <- newListArray (0, length inputData - 1) inputData :: IO (IOArray Int Int)
	    qsort arr 0 (length inputData - 1)
	    printArray arr

	qsort :: (IOArray Int Int) -> Int -> Int -> IO ()
	[As above]
{% endhighlight %}

### Mutable Vector

Vectors are normally to be preferred over Arrays. The resulting code is unsurprisingly similar (Haskell is logical if sometimes bewildering!).  The main issues I faced were

- finding the way to create the mutable vector in the first place, although I suspect that that was mostly due to;
- adding the [type signature for qsort](http://stackoverflow.com/questions/26576416/haskell-compiles-but-wont-type-check).

Here is my code

{% highlight hs %}
	import Control.Monad
	import Control.Monad.ST
	import qualified Data.Vector as V
	import qualified Data.Vector.Mutable as MV
	--import qualified Data.Vector.Unboxed.Mutable as MV

	main = do
		let
			inputData = [5,1,4,3,2]
			initialImmutableVector = V.fromList inputData

		print $ runST $ do
			mutableState <- V.thaw initialImmutableVector
			qsort mutableState 0 (Prelude.length inputData - 1)
			frozen <- V.freeze mutableState
			return frozen

	qsort :: (MV.STVector s Int) -> Int -> Int -> ST s ()
	qsort vec min mx =
		if mx - min < 1 then
			return ()

		else do
			p <- MV.read vec min
			final_i <- foldM (partitioner p) (min+1) [(min+1)..mx]
			swap min (final_i - 1)
			qsort vec min     (final_i-2)
			qsort vec final_i mx

		where
			swap i j = do
				vec_i <- MV.read vec i
				vec_j <- MV.read vec j
				MV.write vec i vec_j
				MV.write vec j vec_i

			partitioner p i acc = do
				vec_acc <- MV.read vec acc
				if vec_acc > p then
					return i
				else do
					swap i acc
					return $ i+1
{% endhighlight %}


### IO Vector

TBC

### How quick are the various solutions?

Simplest things is to just do ':set +s' in ghci, and then you can see the execution time of anything you run, along with memory usage.

Immutable Vector 8.3 seconds
STVector - 0.84 seconds
