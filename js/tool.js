//dependencies
var imjs = require('./../node_modules/imjs/dist/im.js'),
  proteinFeaturesViewer = require('biojs-vis-proteinfeaturesviewer'),
  Channel = require('./jschannel');

require("!style!css!./../node_modules/biojs-vis-proteinfeaturesviewer/build/main.css");

//the app
var service,
  data,
  cleanseCounter = 0,
  badAccessionList = [],
  //ui elements
  elems = {
    hidden: [],
    parentElement: document.getElementById('imFeaturesViewer'),
    footerElement: document.getElementById('imFeaturesFooter'),
    chooserElement: document.getElementById('imChooser')
  },
  settings = {
    maxResultsToShow: 5,
    //this is how often to check if all results are back and remove empty ones
    timeoutInterval: 500,
    //this is how many times to do it. so 20numberOfTimes * 500ms timeoutInterval
    //= check remove bad results for 5 seconds (5,000 ms).
    numberOfTimesToCheckResults: 10,
    //these are useful strings.
    noProteins: ":( Sorry, there are no proteins associated with this ",
    noFeaturesAssociated: "The following proteins had no features associated with them: ",
    viewer: {
      noFeatures: "No features available for protein",
      notFound: "is not found"
    }
  },
  primaryAccessionQuery = {
    Protein: {
      "from": "Protein",
      "select": ["primaryAccession", "primaryIdentifier"],
      "where": [{
        "path": "id",
        "op": "=",
        "code": "A"
      }]
    },
    Gene: {
      "from": "Gene",
      "select": ["proteins.primaryAccession", "proteins.primaryIdentifier", 'symbol'],
      "where": [{
        "path": "id",
        "op": "=",
        "code": "A"
      }]
    }
  },
  selectAnItemQuery = {
    Gene: {
      "from": "Gene",
      "select": ['symbol', 'primaryIdentifier'],
      "where": [{
        "path": "id",
        "op": "ONE OF",
        "values": null
      }]
    },
    Protein: {
      "select": ['primaryAccession', 'primaryIdentifier'],
      "where": [{
        "path": "id",
        "op": "ONE OF",
        "values": null
      }]
    }
  },
  chan = Channel.build({
    window: window.parent,
    origin: "*",
    scope: "CurrentStep"
  });

chan.bind('style', function(trans, params) {

  var head = document.getElementsByTagName("head")[0];
  var link = document.createElement('link');

  link.rel = "stylesheet";
  link.href = params.stylesheet;

  head.appendChild(link);
  return 'ok';
});

chan.bind('configure', function(trans, params) {
  return 'ok';
});

var ui = {
  displayViewer: function(accessions) {
    var head;
    //clear out the loader
    elems.parentElement.innerHTML = "";
    if (head = ui.makeParentHeader()) {
      elems.parentElement.appendChild(head);
    }
    //loop through one or more accessions and get the deets.
    for (var i = 0; i < accessions.length; i++) {
      var accession = accessions[i],
        viewer, protein;

      //add title and container elements
      try {
        protein = document.createElement('div');
        protein.setAttribute('class', 'proteinViewer');
        protein.appendChild(ui.makeAccessionHeader(accession));
        viewer = protein.appendChild(ui.makeViewer(accession));

        //if there are fewer than 5 results, append it. otherwise, just store it.
        if (elems.parentElement.querySelectorAll('.proteinViewer').length < settings.maxResultsToShow) {
          elems.parentElement.appendChild(protein);
        } else {
          elems.hidden.push(protein);
        }

        //populate it with the viewer
        var res = new proteinFeaturesViewer({
          el: viewer,
          uniprotacc: accession
        });
        //check for bad results
      } catch (e) {
        console.error(e);
      }
    }
  },
  makeAccessionHeader: function(accession) {
    var header = document.createElement('h3');
    header.appendChild(document.createTextNode('Primary Accession: ' + accession));
    return header;
  },
  makeParentHeader: function() {
    var header = false;
    try {
      if (data.type === "Gene") {
        header = document.createElement('h2');
        header.appendChild(document.createTextNode('Proteins for ' + data.type + ": " + data.identifier));
      }
    } catch (e) {
      console.error(e);
    }
    return header;
  },
  makeViewer: function(accession) {
    var viewer = document.createElement('div');
    viewer.setAttribute('id', 'proteinViewer-' + accession);
    return viewer;
  },
  /**
   * LEt's let the user know there are no results. sigh.
   */
  noResults: function() {
    elems.parentElement.innerHTML = settings.noProteins + data.type;
  },
  /**
   * The protein viewer doesn't return anything so it we can't force it not to display when there are no results. this is fine when there are a few bad proteins, but for data like fly's Dscam which currently appears to have 79 proteins associated with it, but only 3 which are *actually* proteins. Users don't want to scroll thorugh 76 'no results' divs. So, we nuke'em.
   */
  cleanseResults: function() {
    cleanseCounter++;
    var results = elems.parentElement.querySelectorAll('.proteinViewer'),
      //make a copy of this array so that we can remove items from
      //elems.hidden if they have no results. Removing items from an array
      //you're iterating over would be messy.
      hidden = elems.hidden.slice();
    //sort through dom-attached elements
    for (var i = 0; i < results.length; i++) {
      ui.removeIfEmpty(results[i]);
    }

    //sort through hidden ones
    for (var i = 0; i < hidden.length; i++) {
      ui.removeIfEmpty(hidden[i]);
    }

    //now, we output the list of bad accessions in case someone cares.
    ui.listCleansedResults(badAccessionList);
    //since we only show a finite number of results, it's possible that we
    //just 'cleansed' all of the results out of the viewport if the first five
    //accessions were all ones with no data. Check for this and add more results if we have them.
    ui.replenishResultCount();

    ui.makeShowAllControl();

    //rinse and repeat for some time to give ajax calls time to return.
    if (cleanseCounter < settings.numberOfTimesToCheckResults) {
      setTimeout(ui.cleanseResults, settings.timeoutInterval);
    }
  },
  makeShowAllControl: function() {
    var showAll = document.getElementById('showAll');
    if (elems.hidden.length > 0) {
      //X of x results:
      var showAllText = document.createTextNode("Showing " + settings.maxResultsToShow + " results of " + (settings.maxResultsToShow + elems.hidden.length));

      //empty out the old stuff
      showAll.innerHTML = "";

      showAll.appendChild(showAllText);

      //Show all button:
      var showAllButton = document.createElement('button');
      showAllButton.setAttribute('class', 'btn');
      var showAllButtonText = document.createTextNode('Show all');
      showAllButton.appendChild(showAllButtonText);

      //show all button behaviour
      showAllButton.addEventListener('click', function() {
        ui.showAllResults();
      });

      showAll.appendChild(showAllButton);
    } else {
      showAll.innerHTML = "";
    }
  },
  /**
   * [function description]
   * @return {[type]} [description]
   */
  showAllResults: function() {
    //remove the show all button.
    try {
      document.getElementById('showAll').innerHTML = "";
    } catch (e) {
      console.error(e);
    }

    for (var i = 0; i < elems.hidden.length; i++) {
      elems.parentElement.appendChild(elems.hidden[i]);
    }
  },

  /**
   * Helper for cleanseResults. Check how many results we can see
   * if it's less than settings.maxresultstoshow, add some more
   */
  replenishResultCount: function() {
    if ((ui.getNumResults() < settings.maxResultsToShow) && (elems.hidden.length > 0)) {
      var newElem;
      //if you remove elements from an array you're iterating over, counting
      //backwards prevents the array index from messing up.
      for (var i = settings.maxResultsToShow; i > 0; i--) {
        if (elems.hidden.length > 0) {
          try {
            newElem = elems.hidden.pop();
            elems.parentElement.appendChild(newElem);
          } catch (e) {
            console.error(e, newElem);
          }
        }
      }
    }
  },
  getNumResults: function() {
    return elems.parentElement.querySelectorAll('.proteinViewer').length;
  },
  removeIfEmpty: function(elem) {
    var elem, suspect, suspectName;
    suspect = elem.querySelector('div');
    //remove it if there are no features for this 'protein'
    if (ui.isEmpty(suspect.innerHTML)) {
      if (elem.parentNode) {
        //remove it if it's attached to the dom
        elems.parentElement.removeChild(elem);
      } else {
        //it must be a hidden elem. Remove it from the main hidden array
        elems.hidden.splice(elems.hidden.indexOf(elem), 1);
      }
      //save the bad ones for later so we can tell the user.
      suspectName = suspect.getAttribute('id').split('proteinViewer-')[1];
      badAccessionList.push(suspectName);
    }
  },
  isEmpty: function(htmlToCheck) {
    var isEmpty = false;
    //does the div display a 'no features' message?
    isEmpty = (htmlToCheck.indexOf(settings.viewer.noFeatures) === 0);
    //does it display a 'primary accession "BLAHBLAH" is not found' message?
    isEmpty = isEmpty || (htmlToCheck.indexOf(settings.viewer.notFound) >= 0);
    return isEmpty;
  },
  /**
   * Helper for CleanseResults. Shows users which divs were ommitted due
   * to no protein features
   * @param  {array} listOfResults List of Primary Accessions associated with this gene or protein, but only ones that have no features.
   */
  listCleansedResults: function(listOfResults) {
    var notShown = document.getElementById('badResults'),
      notShownText = document.createTextNode(settings.noFeaturesAssociated + listOfResults.join(', '));

    notShown.innerHTML = "";
    notShown.setAttribute('class', 'well');
    notShown.appendChild(notShownText);
  },

  /**
   * Ideally we'd only like to see one data input item. But if we get many,
   * we can prompt the user to choose the right one, if needed.
   */
  chooseItem: function() {
    try {
      if (data.what === 'list') {
        service.fetchList(data.name).then(function(listResponse){
          listResponse.contents().then(function(contents){
            ui.makeItemChooser(contents);
          });
        });
      } else if (data.ids && data.ids.length > 1) {
        //prompt the user to select data
        var identifierQuery = selectAnItemQuery[data.type];
        identifierQuery.where[0].values = data.ids;

        //load the names of the genes, because who understands identifiers anyway?
        service.records(identifierQuery).then(function(identifiers) {
          ui.makeItemChooser(identifiers);
        });

        //return dataList[0];
      } else if (data.id || data.ids.length === 1) {
        elems.chooserElement.remove();
        //there's only one item. Cool. init the graph with it.
        init(data.id || data.ids[0]);
      }
    } catch(e) {console.error(e);}
  },
  /**
   * Makes the item chooser UI. and defaults to the first result in the array
   * @param  {array} identifiers array of results from which to choose. Must be intermine results with a (symbol, primaryaccession, or primaryIdentifier) and an objectid.
   */
  makeItemChooser : function(identifiers){
    var item, itemName,
      chooserText = "<h3>Which " + data.type + " would you like to see protein features for?</h3> <div>";
    for (var i = 0; i < identifiers.length; i++) {
      item = identifiers[i];
      itemName = item.primaryAccession || item.symbol || item.primaryIdentifier;
      chooserText += "<span class='label label-default' id='item-" + item.objectId + "'>" + itemName + "</span>";
    }

    elems.chooserElement.innerHTML = chooserText + "</div>";

    elems.chooserElement.addEventListener('click', function(e) {
      if (e.target.id.indexOf('item-') === 0) {
        var theItem = e.target.id.split('item-')[1];

        //init graph using the chosen gene/protein's id
        init(e.target.id.split('item-')[1]);

        //dehighlight others if present
        var active = elems.chooserElement.querySelector('.label-success');
        if (active) {
          active.setAttribute('class', 'label label-default');
        }
        //highlight the active one
        e.target.setAttribute('class', 'label label-success');

        //notify we have an item selected
        reportItems(service, data.type, data.type, data.ids || data.name, ['selected'], data.what);
      }
    });

    //initialise to the first element, whatever it is.
    elems.chooserElement.querySelector('span').click();
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
  console.log("%cdata","background:honeydew;color:hotpink;font-weight:bold;",params);
  try {
    service = new imjs.Service({
      root: params.root || params.service.root
    });
    data = params;

    //once an item is chosen, init() is kicked off
    ui.chooseItem();

    //reportItems(service, data.type, data.type, data.ids, ['available']);

    trans.complete('ok');
  } catch (e) {
    trans.error('InitialisationError', e);
  }
  trans.delayReturn(true);
});


/**
 * Steps likes to share IDs, but the protein viewer likes primary accessions.
 * So, let's getthe accession for a given protein or gene.
 * @param  {string or int} id   an intermine/steps object id
 * @param  {string} type        "Gene" or "Protein" only.
 */
function init(mainItem) {
  var accessions, type = data.type;

  //build query
  primaryAccessionQuery[type].where[0].value = mainItem;

  //get the data
  try {
    service.records(primaryAccessionQuery[type]).then(function(results) {
      if (results.length > 0) {
        //store the identifier
        if (type === "Gene") {
          data.identifier = results[0].symbol;
        }
        accessions = getAccessions(results[0]);
        if (accessions.length > 0) {
          //show results
          ui.displayViewer(accessions);
        } else {
          //the double sorry is a bit messy.
          ui.noResults(type);
        }
      } else {
        //show sorry because there are no results.
        ui.noResults(type);
      }
      //check for dud results.
      setTimeout(ui.cleanseResults, settings.timeoutInterval);
    });
  } catch (e) {
    console.error(e);
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
    primaryAccessions.push(results.primaryAccession);
  } else {
    for (var i = 0; i < results.proteins.length; i++) {
      protein = results.proteins[i];
      if (protein.primaryAccession) { //weed out nulls
        primaryAccessions.push(protein.primaryAccession);
      } else {
        badAccessionList.push(protein.primaryIdentifier);
      }
    }
  }
  return primaryAccessions;
}

function reportItems(service, path, type, ids, categories, what) {
  if (!categories) {
    categories = ['selected'];
  }
  if (!what) {
    what = 'ids';
  }

  var data = {
    key: (categories.join(',') + '-' + path),
    type: type,
    what: what,
    service: {
      root: service.root
    }
  }

  if (what == "list") {
    data.name = ids;
  } else {
    data.ids = ids;
  }
  
  chan.notify({
    method: 'has',
    params: {
      what: what,
      data: data
    }
  });
}
