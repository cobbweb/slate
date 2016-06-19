
import Document from './document'
import Selection from './selection'
import Transform from './transform'
import { Record, Stack } from 'immutable'

/**
 * History.
 */

const History = new Record({
  undos: new Stack(),
  redos: new Stack()
})

/**
 * Default properties.
 */

const DEFAULT_PROPERTIES = {
  document: new Document(),
  selection: new Selection(),
  history: new History(),
  isNative: true
}

/**
 * Document-like methods, that should be mixed into the `State` prototype.
 */

const DOCUMENT_LIKE_METHODS = [
  'deleteAtRange',
  'deleteBackwardAtRange',
  'deleteForwardAtRange',
  'insertAtRange',
  'splitAtRange'
]

/**
 * State.
 */

class State extends Record(DEFAULT_PROPERTIES) {

  /**
   * Create a new `State` with `properties`.
   *
   * @param {Objetc} properties
   * @return {State} state
   */

  static create(properties = {}) {
    return new State(properties)
  }

  /**
   * Return a new `Transform` with the current state as a starting point.
   *
   * @return {Transform} transform
   */

  transform() {
    return new Transform({ state: this })
  }

  /**
   * Delete a single character.
   *
   * @return {State} state
   */

  delete() {
    let state = this
    let { document, selection } = state

    // When collapsed, there's nothing to do.
    if (selection.isCollapsed) return state

    // Otherwise, delete and update the selection.
    document = document.deleteAtRange(selection)
    selection = selection.moveToStart()
    state = state.merge({ document, selection })
    return state
  }

  /**
   * Delete backward `n` characters at the current selection.
   *
   * @param {Number} n (optional)
   * @return {State} state
   */

  deleteBackward(n = 1) {
    let state = this
    let { document, selection } = state
    let after = selection

    // Determine what the selection should be after deleting.
    const { startKey } = selection
    const startNode = document.getNode(startKey)

    if (selection.isExpanded) {
      after = selection.moveToStart()
    }

    else if (selection.isAtStartOf(startNode)) {
      const parent = document.getParentNode(startNode)
      const previous = document.getPreviousNode(parent).nodes.first()
      after = selection.moveToEndOf(previous)
    }

    else if (!selection.isAtEndOf(document)) {
      after = selection.moveBackward(n)
    }

    // Delete backward and then update the selection.
    document = document.deleteBackwardAtRange(selection)
    selection = after
    state = state.merge({ document, selection })
    return state
  }

  /**
   * Delete forward `n` characters at the current selection.
   *
   * @param {Number} n (optional)
   * @return {State} state
   */

  deleteForward(n = 1) {
    let state = this
    let { document, selection } = state
    let after = selection

    // Determine what the selection should be after deleting.
    if (selection.isExpanded) {
      after = selection.moveToStart()
    }

    // Delete forward and then update the selection.
    document = document.deleteForwardAtRange(selection)
    selection = after
    state = state.merge({ document, selection })
    return state
  }

  /**
   * Insert a `text` string at the current cursor position.
   *
   * @param {String} text
   * @return {State} state
   */

  insertText(text) {
    let state = this
    let { document, selection } = state

    // Insert the text and update the selection.
    document = document.insertTextAtRange(selection, text)
    selection = selection.moveForward(text.length)
    state = state.merge({ document, selection })
    return state
  }

  /**
   * Split at a the current cursor position.
   *
   * @return {State} state
   */

  split() {
    let state = this
    let { document, selection } = state
    let after

    // Split the document.
    document = document.splitAtRange(selection)

    // Determine what the selection should be after splitting.
    const { startKey } = selection
    const startNode = document.getNode(startKey)
    const parent = document.getParentNode(startNode)
    const next = document.getNextNode(parent)
    const text = next.nodes.first()
    selection = selection.moveToStartOf(text)

    state = state.merge({ document, selection })
    return state
  }

}

/**
 * Mix in node-like methods.
 */

DOCUMENT_LIKE_METHODS.forEach((method) => {
  State.prototype[method] = function (...args) {
    let { document } = this
    document = document[method](...args)
    return this.merge({ document })
  }
})

/**
 * Export.
 */

export default State