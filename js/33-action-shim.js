/* ============================================================================
   ACTION COMPAT SHIM (v1319). The OLD Action module is DELETED.

   What was here: 6,070 lines of the pre-remake Action experience (the green
   grid, the slider rail, its own AI chat and plan writer). It was quarantined
   out of js/02 in v1318, verified byte-identical, and removed in v1319.

   Why this file still exists: about eighty places across the app still name
   the old door (the home's Build my plan, the pillar tap, module faces, the
   sheet nav, the router, the paywall, push). Rather than edit eighty call
   sites, the NAME survives here as a forwarder, so every one of those doors
   opens the real Action flow (js/30) and none of them can ever reach code
   that no longer exists.

   THERE IS NOW EXACTLY ONE ACTION SYSTEM: js/30-action-flow.js, its plan
   engine and its judge. This file holds no behaviour of its own.

   Loads immediately after js/02 because js/11-init calls .init() at boot.
   ========================================================================= */
const ActionExperience = {
  // the old module never opens, so nothing may believe it is open
  isOpen: false,
  pageWrap: null,

  // every legacy door lands in the real flow
  open() {
    try {
      if (window.ActionFlow && typeof ActionFlow.start === 'function') return ActionFlow.start();
    } catch (e) {}
  },

  // the old surfaces are gone; these exist so old callers stay harmless
  init() {},
  close() {},
  render() {},
  renderContent() {}
};
