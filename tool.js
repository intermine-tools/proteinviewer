chan = Channel.build({
  window: window.parent,
  origin: "*",
  scope: "CurrentStep"
});

chan.bind('configure', function (trans, params) {
  return 'ok';
});

chan.bind('init', function (trans, params) {
  try {
    var biojs_vis_proteinFeaturesViewer = require('biojs-vis-proteinfeaturesviewer'),
    el = document.getElementById('imFeaturesViewer'),
    instance = new biojs_vis_proteinFeaturesViewer({el: el, uniprotacc : 'P37231'});
  } catch (e) {
    trans.error('InitialisationError', String(e));
  }


  function hasItem (id, type) {
    // Notify as generic and specific item.
    chan.notify({
      method: 'has',
      params: {
        what: 'item',
        data: {
          id: id,
          type: type,
          service: {
            root: service.root
          }
        }
      }
    });
    chan.notify({
      method: 'has',
      params: {
        what: type,
        data: {
          id: id,
          service: {
            root: service.root
          }
        }
      }
    });
  }

  function hasQuery (query) {
    chan.notify({
      method: 'has',
      params: {
        what: 'query',
        data: {
          query: query,
          service: { root: service.root }
        }
      }
    });
  }
});
