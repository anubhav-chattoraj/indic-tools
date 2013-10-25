var sort_devanagari = (function($){
  return function(options){
    "use strict";

    // sanity check, remove later
    console.clear();
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        console.log(key + " -> " + options[key]);
      }
    }
  };
})(jQuery);