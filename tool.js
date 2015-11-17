var service,
  primaryAccessionQuery = {
    Protein: {
      "from": "Protein",
      "select": ["primaryAccession"],
      "where": [{
        "path": "id",
        "op": "=",
        "code": "A"
      }]
    },
    Gene: {
      "from": "Gene",
      "select": ["proteins.primaryAccession"],
      "where": [{
        "path": "id",
        "op": "=",
        "code": "A"
      }]
    }
  },
  parentElement = document.getElementById('imFeaturesViewer'),
chan = Channel.build({
  window: window.parent,
  origin: "*",
  scope: "CurrentStep"
});

chan.bind('style', function (trans, params) {

  var head = document.getElementsByTagName("head")[0];
  var link = document.createElement('link');

  link.rel = "stylesheet";
  link.href = params.stylesheet;

  head.appendChild(link);

});

chan.bind('configure', function(trans, params) {
  return 'ok';
});

var ui = {
  displayViewer : function(accessions) {
    var proteinFeaturesViewer = require('biojs-vis-proteinfeaturesviewer');
      //clear out the loader
      parentElement.innerHTML = "";
    //loop through one or more accessions and get the deets.
    for (var i = 0; i < accessions.length; i++) {
      var accession = accessions[i],
      viewer, protein;

      //add title and container elements
      try {
        protein = document.createElement('div');
        protein.setAttribute('class','proteinViewer');
        protein.appendChild(ui.makeHeader(accession));
        viewer = protein.appendChild(ui.makeViewer(accession));
        parentElement.appendChild(protein)
      //populate it with the viewer
        var res = new proteinFeaturesViewer({
          el: viewer,
          uniprotacc: accession
        });
        //check for bad results
      } catch (e) {console.error(e);}
    }
  },
  makeHeader : function(accession){
    var header = document.createElement('h2');
    header.appendChild(document.createTextNode(accession));
    return header;
  },
  makeViewer : function(accession){
    var viewer = document.createElement('div');
    viewer.setAttribute('id','proteinViewer-'+accession);
    return viewer;
  },
  noResults : function (type) {
    parentElement.innerHTML = ":( Sorry, there are no proteins associated with this " + type;
  }
};


/**
 * We can handle genes or proteins.
 * For proteins it's simple: Get the primary accession for the protein and
 * show the feature viewer. For genes we need to get all the primary accessions
 * for the gene's proteins. Most (fly) have fewer than 5 proteins. For the few
 * Which have more, we'll get collapse-ey.
 * @param  {[type]} 'init'   [description]
 * @param  {[type]} function (trans,       params [description]
 * @return {[type]}          [description]
 */
chan.bind('init', function(trans, params) {
  service = new imjs.Service({
    root: params.service.root
  });
  init(params.id, params.type);

  /**
   * Steps likes to share IDs, but the protein viewer likes primary accessions.
   * So, let's getthe accession for a given protein or gene.
   * @param  {string or int} id   an intermine/steps object id
   * @param  {string} type        "Gene" or "Protein" only.
   */
  function init(id, type) {
    //build query
    primaryAccessionQuery[type].where[0].value = id;
    try {
      service.records(primaryAccessionQuery[type]).then(function(results) {
        if (results.length) {
          //show results
          ui.displayViewer(getAccessions(results[0]));
        } else {
          //show sorry because there are no results.
          ui.noResults(type);
        }
      });
    } catch (e) {
      trans.error('InitialisationError', String(e));
    }
  }

  /*
   * Protein results are nested deeper than gene results, so we need to select
   * the correct part of the data depending on which we have.
   */
  function getAccessions(results) {
    var primaryAccessions = [],
      protein;
    if (results.primaryAccession) {
      primaryAccessions = results.primaryAccession;
    } else {
      for (var i = 0; i < results.proteins.length; i++) {
        protein = results.proteins[i];
        primaryAccessions.push(protein.primaryAccession);
      }
    }
    return primaryAccessions;
  }


  function hasItem(id, type) {
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

  function hasQuery(query) {
    chan.notify({
      method: 'has',
      params: {
        what: 'query',
        data: {
          query: query,
          service: {
            root: service.root
          }
        }
      }
    });
  }
});
