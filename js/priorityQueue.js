/**
 * priorityQueue.js - Binary Min-Heap Priority Queue
 *
 * Implements a generic, efficient min-priority queue suitable for state-space search algorithms (UCS, A*).
 * Decoupled from UI and specific domain representations.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node / CommonJS
        module.exports = factory();
    } else {
        // Browser Global
        root.PriorityQueue = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Binary Min-Heap Priority Queue.
     * Elements are stored as { item, priority, sequenceNumber }.
     * Sequence number ensures FIFO tie-breaking for equal priorities.
     */
    class PriorityQueue {
        /**
         * @param {Function} [comparator] Optional custom comparator: (a, b) => number.
         * Default compares numeric `priority` ascending, breaking ties by `sequenceNumber`.
         */
        constructor(comparator) {
            this.heap = [];
            this.counter = 0;
            this.comparator = comparator || ((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.sequenceNumber - b.sequenceNumber;
            });
        }

        /**
         * Returns the number of items in the queue.
         * @returns {number}
         */
        size() {
            return this.heap.length;
        }

        /**
         * Checks if the queue is empty.
         * @returns {boolean}
         */
        isEmpty() {
            return this.heap.length === 0;
        }

        /**
         * Inserts an item with the given priority into the queue.
         * @param {*} item
         * @param {number} priority
         */
        enqueue(item, priority) {
            const entry = {
                item,
                priority,
                sequenceNumber: this.counter++
            };
            this.heap.push(entry);
            this._siftUp(this.heap.length - 1);
        }

        /**
         * Removes and returns the lowest-priority item from the queue.
         * @returns {*} The item with minimum priority, or undefined if empty.
         */
        dequeue() {
            if (this.isEmpty()) return undefined;

            const root = this.heap[0];
            const last = this.heap.pop();

            if (this.heap.length > 0) {
                this.heap[0] = last;
                this._siftDown(0);
            }

            return root.item;
        }

        /**
         * Peeks at the item with minimum priority without removing it.
         * @returns {*} The item with minimum priority, or undefined if empty.
         */
        peek() {
            return this.isEmpty() ? undefined : this.heap[0].item;
        }

        /**
         * Peeks at the minimum priority value.
         * @returns {number|undefined}
         */
        peekPriority() {
            return this.isEmpty() ? undefined : this.heap[0].priority;
        }

        /**
         * Clears all items from the queue.
         */
        clear() {
            this.heap = [];
            this.counter = 0;
        }

        /**
         * Returns an array containing the top items currently in the PriorityQueue,
         * sorted by priority. Limits extraction to avoid performance degradation with large heaps.
         * @param {number} [maxDisplay=15]
         * @returns {Array<{item: *, priority: number}>}
         */
        getSnapshot(maxDisplay = 15) {
            if (this.heap.length === 0) return [];
            // Sample only the top candidates in the heap rather than sorting tens of thousands of elements
            const candidateCount = Math.min(this.heap.length, maxDisplay * 3);
            return this.heap
                .slice(0, candidateCount)
                .sort(this.comparator)
                .slice(0, maxDisplay)
                .map(entry => ({
                    item: entry.item,
                    priority: entry.priority
                }));
        }

        // --- Internal Heap Helper Methods ---

        _siftUp(index) {
            let curr = index;
            while (curr > 0) {
                const parent = Math.floor((curr - 1) / 2);
                if (this.comparator(this.heap[curr], this.heap[parent]) < 0) {
                    this._swap(curr, parent);
                    curr = parent;
                } else {
                    break;
                }
            }
        }

        _siftDown(index) {
            let curr = index;
            const length = this.heap.length;

            while (true) {
                let smallest = curr;
                const left = 2 * curr + 1;
                const right = 2 * curr + 2;

                if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
                    smallest = left;
                }
                if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
                    smallest = right;
                }

                if (smallest !== curr) {
                    this._swap(curr, smallest);
                    curr = smallest;
                } else {
                    break;
                }
            }
        }

        _swap(i, j) {
            const temp = this.heap[i];
            this.heap[i] = this.heap[j];
            this.heap[j] = temp;
        }
    }

    return PriorityQueue;
}));
