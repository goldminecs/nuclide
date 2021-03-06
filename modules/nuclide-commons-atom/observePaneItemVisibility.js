/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {observableFromSubscribeFunction} from 'nuclide-commons/event';
import memoize from 'lodash.memoize';
import {Observable, Scheduler} from 'rxjs';

// TODO(T17495608): Currently, docks don't have a way of observing their visibility so this will
//   have some false positives when an item is its pane's active item but its dock is hidden.
export default function observePaneItemVisibility(
  item: Object,
): Observable<boolean> {
  // If this is a version of Atom that doesn't have Docks, return an empty observable. Until they
  // land, the functionality is provided by the workspace views package, which calls
  // `didChangeVisibility()` on items automatically.
  // TODO cleanup post Atom 1.17
  if (atom.workspace.getPaneContainers == null) {
    return Observable.empty();
  }

  return observeActiveItems()
    .map(activeItems => activeItems.includes(item))
    .distinctUntilChanged();
}

const observeActiveItems = memoize(() => {
  // An observable that emits `{pane, item}` whenever the active item of a pane changes.
  const itemActivations = Observable.merge(
    // $FlowFixMe: Add `getPaneContainers()` to the type defs once Atom 1.17 lands.
    ...atom.workspace.getPaneContainers().map(paneContainer => {
      const observePanes = paneContainer.observePanes.bind(paneContainer);
      return observableFromSubscribeFunction(observePanes).flatMap(pane => {
        const paneDestroyed = observableFromSubscribeFunction(
          pane.onDidDestroy.bind(pane),
        );
        const activeItems = observableFromSubscribeFunction(
          pane.observeActiveItem.bind(pane),
        ).takeUntil(paneDestroyed);
        return Observable.concat(
          activeItems.map(item => ({pane, item})),
          Observable.of({pane, item: null}),
        );
      });
    }),
  );

  // Create a map of panes to their active items. We could look this up by examining the workspace
  // every time; this is an optimization.
  const panesToActiveItem = itemActivations.scan((acc, {pane, item}) => {
    if (item == null) {
      acc.delete(pane);
    } else {
      acc.set(pane, item);
    }
    return acc;
  }, new Map());

  return (
    panesToActiveItem
      // When dragging items between panes, they'll be quickly deactivated and activated again. To
      // avoid doing extra work, we debounce and use the rAF scheduler.
      .debounceTime(0, Scheduler.animationFrame)
      .map(map => Array.from(map.values()))
      .share()
  );
});
