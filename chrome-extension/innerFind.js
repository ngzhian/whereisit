PROD = "http://45.33.82.241:8880";
DEV = "http://localhost:8080";
SERVER_URL = PROD;

function hideInfo() {
  $("#title").hide();
  $("#selSom").hide();
  $("#spinner").hide();
}

function loading() {
  $("#spinner").show();
}

function failMessage() {
  $('#fail-msg').show();
}

function findstuff(data) {
  var userSelection = data.text;
  var location = data.location;
  var cachedResults = data.cached;
  var callback = data.callback;
  var success = callback;

  loading();

  if (cachedResults !== undefined) {
    console.log('using cached results:' + cachedResults);
    success(cachedResults);
    return;
  }

  var url = SERVER_URL + (data.ff ? '/file' : '');
  console.log(url);

  sendRequest({
    url: url,
    snippet: userSelection,
    location: location,
  }, success, function() {});
}

/**
 * Given a user selection, make the API call to server
 * and populate the background html
 */
function findit(data) {
  var userSelection = data.text;
  var location = data.location;

  function addToDom(resp) {
    $status = $('#status');
    $status.find('#search').text(userSelection);
    var status = document.getElementById('status');
    html = resp.forEach(function(v) {
      $status.append(makeResultHtml(v, location));
    });
    $("#title").show();
  }

  if (typeof(userSelection) === "undefined") {
    data.callback = function(resp) {
      $("#spinner").hide();
      chrome.tabs.sendMessage(
        data.tabId, {text: 'addlinks', tags: resp})
    }
    data.ff = true;
  } else {
    data.callback = function(resp) {
      hideInfo();
      addToDom(resp);
    }
    data.ff = false;
  }

  findstuff(data)
}

/* Make the ajax call to server */
function sendRequest(data, success, failure) {
  $.ajax({
    url: data.url,
    method: 'POST',
    data: JSON.stringify({'snippet': data.snippet, 'url': data.location}),
    contentType: 'application/json; charset=utf-8'
  }).done(function(resp) {
    success(resp);
  }).fail(function(resp) {
    failure(resp);
  })
}

function makeResultHtml(v, location) {
  var $template = $(resultTemplate);
  var link = makeLink(v.filepath, location, v.linenum);
  $template.find('.link')
    .attr('href', link)
    .text(v.filepath + '(line ' + v.linenum + ')');
  $template.find('.snippet pre')
    .text(v.exerpt);
  return $template;
}

var resultTemplate = '<div class="result">' +
    '<div class="path">' +
      '<a class="link" target="_blank"></a>' +
    '</div>' +
    '<div class="snippet">' +
      '<pre></pre>' +
    '</div>' +
  '</div>';

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  var tabId = sender.tab.id;
  setLoadingState(tabId);

  // called from page load (injected script)
  if (message.type === 'FINDIT' && message.location && tabId) {
    message.tabId = tabId;
    pageFindIt(message, sendResponse);
  } else if (message.type === 'CONTEXT_MENU') {
    contextMenu(message, sendResponse);
  }
  setNormalState(tabId);

  // This function becomes invalid when the event listener returns,
  // unless you return true from the event listener to indicate you
  // wish to send a response asynchronously (this will keep the
  // message channel open to the other end until sendResponse is called).
  // https://developer.chrome.com/extensions/runtime#event-onMessage
  return true;
});

function contextMenu(message, callback) {
  message.ff = false;
  message.callback = callback;
  findstuff(message)
}

function pageFindIt(message, callback) {
  message.ff = true;
  message.callback = callback;
  findstuff(message);
}
