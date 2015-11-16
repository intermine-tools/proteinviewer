var primaryAccessionQuery = {
  "from": "Protein",
  "select": [ "primaryAccession"],
  "where": [
    {
      "path": "id",
      "op": "=",
      "code": "A"
    }
  ]
},
service;



chan = Channel.build({
  window: window.parent,
  origin: "*",
  scope: "CurrentStep"
});

chan.bind('configure', function (trans, params) {
  return 'ok';
});

chan.bind('init', function (trans, params) {
  service = new imjs.Service({root:params.service.root});
  getProteinPrimaryAccession(params.id);

  /**
   * Steps likes to share IDs, but the protein viewer likes primary accessions.
   * So, let's getthe accession for a given protein.
   */
  function getProteinPrimaryAccession(id) {
    primaryAccessionQuery.where[0].value = id;
      service.records(primaryAccessionQuery).then( function(results) {
      try {
        var biojs_vis_proteinFeaturesViewer = require('biojs-vis-proteinfeaturesviewer'),
        el = document.getElementById('imFeaturesViewer'),
        instance = new biojs_vis_proteinFeaturesViewer({el: el, uniprotacc : results[0].primaryAccession});
      } catch (e) {
        trans.error('InitialisationError', String(e));
      }
    });
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
