var sort_devanagari = (function($){
  return function(words, options){
    "use strict";

    var weights = new Hashtable(), matras = new Hashtable(), consonants = new HashSet();

    (function init() {
      var nuqta_secondary = 20, candrabindu_secondary = 20, lowercase_secondary = 20,
        s_consonants = 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ',
        s_vowels = 'आइईउऊऋॠऌॡएऐओऔॲऑ', // doesn't include अ
        s_matras = 'ािीूुृॄॢॣेैोौॅॉ',
        s_uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        s_lowercase = 'abcdefghijklmnopqrstuvwzyz',
        order = ' अ' + s_vowels + 'ंः' + s_consonants + s_uppercase,
        i, this_char;
      for(i = 0; i < order.length; i++) {
        // The multiples of 10 make it easy to insert more letters in between
        weights.put(order.charAt(i), {primary: (i+1)*10, secondary: 0});
      };
      for(i = 0; i < s_lowercase.length; i++) {
        this_char = s_lowercase.charAt(i);
        weights.put(this_char, {
          primary: weights.get(s_uppercase.charAt(i)).primary,
          secondary: lowercase_secondary
        });
      }

      weights.put('़', { primary: 0, secondary: nuqta_secondary });
      // candrabindu weights
      if(typeof options.candrabindu_pos === 'undefined') option.candrabindu_pos = 'with_anusvara';
      if(options.candrabindu_pos === 'with_anusvara') {
        weights.put('ँ', { primary: weights.get('ं').primary, secondary: candrabindu_secondary });
      } else if(options.candrabindu_pos === 'after_anusvara') {
        weights.put('ँ', { primary: weights.get('ं').primary + 5, secondary: 0 });
      } else if(options.candrabindu_pos === 'after_consonants') {
        // the +9 ensures that क्ष, त्र, ज्ञ have weights below this value
        weights.put('ँ', { primary: weights.get('ळ').primary + 9, secondary: 0 });
      }

      for(i = 0; i < s_matras.length; i++) {
        matras.put(s_matras.charAt(i), s_vowels.charAt(i));
      }
      for(i = 0; i < s_consonants.length; i++) {
        consonants.add(s_consonants.charAt(i));
      }
    })();

    var processed_words = $.map(words, function(word, idx) {
      var processed_word = {idx: idx, primary: [], secondary: []},
        possible_schwa = false, i, this_char;

      function push_weight(letter) {
        var weight = weights.get(letter);
        if (typeof weight === 'undefined') {
          return;
        }
        processed_word.primary.push(weight.primary);
        processed_word.secondary.push(weight.secondary);
      }

      for(i = 0; i < word.length; i++) {
        this_char = word.charAt(i);
        if(this_char === '्') {
          possible_schwa = false;
        } else if(this_char === '़') {
          // nuqta modifies the previous char
          processed_word.secondary[processed_word.secondary.length - 1] +=
            weights.get('़').secondary;
        } else if(matras.containsKey(this_char)) {
          possible_schwa = false;
          push_weight(matras.get(this_char));
        } else {
          if(possible_schwa) {
            push_weight('अ');
            possible_schwa = false;
          }
          if(consonants.contains(this_char)) {
            possible_schwa = true;
          }
          push_weight(this_char);
        }
      }
      if(possible_schwa) {
        push_weight('अ');
      }

      if(options.rtl) {
        processed_word.primary.reverse(); processed_word.secondary.reverse();
      }

      return processed_word;
    });

    function compare_processed_words(word1, word2) {
      var i;
      for(i = 0; i < word1.primary.length && i < word2.primary.length; i++) {
        if(word1.primary[i] > word2.primary[i]) {
          return 1;
        } else if(word1.primary[i] < word2.primary[i]) {
          return -1;
        }
      } // control flows here if all primaries compared are equal
      if(word1.primary.length < word2.primary.length) {
        return -1;
      } else if(word1.primary.length > word2.primary.length) {
        return 1;
      } // control flows here if both words are same length; try secondaries
      for(i = 0; i < word1.secondary.length && i < word2.secondary.length; i++) {
        if(word1.secondary[i] > word2.secondary[i]) {
          return 1;
        } else if(word1.secondary[i] < word2.secondary[i]) {
          return -1;
        }
      } // control flows here if all secondaries are also equal
      return 0;
    }
    processed_words.sort(compare_processed_words);

    var result = $.map(processed_words, function(processed_word, idx) {
      return words[processed_word.idx];
    });

    if(options.descending) {
      result.reverse();
    }
    return result;
  };
})(jQuery);