var sort_devanagari = (function($){
  "use strict";
  return function(words, options){

    var weights = new Hashtable(), matras = new Hashtable(),
      consonants = new HashSet(), ignore = new HashSet(),
      digits = new Hashtable(),
      nuqta_secondary = 20, avagraha_secondary = 10;

    (function init() {
      var
        s_consonants = 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ',
        s_vowels = 'आइईउऊऋॠऌॡएऐओऔॲऑ', // doesn't include अ
        s_matras = 'ािीूुृॄॢॣेैोौॅॉ',
        s_with_nuqta    = 'ऩऱऴक़ख़ग़ज़ड़ढ़फ़य़',
        s_without_nuqta = 'नरळकखगजडढफय',
        s_devanagari_digits = '१२३४५६७८९०',
        s_roman_digits      = '1234567890',
        order = ' ॐअ' + s_vowels + 'ंः' + s_consonants + '।॥',
        i, this_char;
      for(i = 0; i < order.length; i++) {
        // The multiples of 10 make it easy to insert more letters in between
        weights.put(order.charAt(i), {primary: (i+1)*10, secondary: 0});
      }

      weights.put('़', { primary: 0, secondary: nuqta_secondary });

      var candrabindu_primary, candrabindu_secondary = 0;
      if(typeof options.candrabindu_pos === 'undefined') option.candrabindu_pos = 'with_anusvara';
      if(options.candrabindu_pos === 'with_anusvara') {
        candrabindu_primary = weights.get('ं').primary;
        candrabindu_secondary = 20;
      } else if(options.candrabindu_pos === 'before_anusvara') {
        candrabindu_primary = weights.get('ं').primary - 5;
      } else if(options.candrabindu_pos === 'after_anusvara') {
        candrabindu_primary = weights.get('ं').primary + 5;
      } else if(options.candrabindu_pos === 'after_consonants') {
        // the +9 ensures that क्ष, त्र, ज्ञ have weights below this value
        candrabindu_primary = weights.get('ळ').primary + 9;
      }
      weights.put('ँ', {primary: candrabindu_primary, secondary: candrabindu_secondary});

      weights.put('ऽ', { primary: weights.get('अ').primary, secondary: avagraha_secondary });
      for(i = 0; i < s_matras.length; i++) {
        matras.put(s_matras.charAt(i), s_vowels.charAt(i));
      }
      for(i = 0; i < s_devanagari_digits.length; i++) {
        digits.put(s_devanagari_digits.charAt(i), s_roman_digits.charAt(i));
        digits.put(s_roman_digits.charAt(i), s_roman_digits.charAt(i));
      }
      for(i = 0; i < s_consonants.length; i++) {
        consonants.add(s_consonants.charAt(i));
      }
      for(i = 0; i < s_with_nuqta.length; i++) {
        weights.put(s_with_nuqta.charAt(i), {
          primary: weights.get(s_without_nuqta.charAt(i)).primary,
          secondary: nuqta_secondary,
        });
        consonants.add(s_with_nuqta.charAt(i));
      }
      if(typeof options.ignore !== 'undefined' && options.ignore !== null){
        for(i = 0; i < options.ignore.length; i++) {
          ignore.add(options.ignore.charAt(i));
        }
      }
    })();

    function parseDevanagariInt(number_string) {
      var roman_number_string = $.map(number_string.split(''), function(digit, idx) {
        return digits.get(digit);
      }).join('');
      return parseInt(roman_number_string);
    }

    function segment_word(word) {
      // segment types: 1 = Numbers, 2 = Known characters, 3 = Unknown characters
      var this_segment = '', segments = [], segment_type, i, this_type, this_char;

      for(i = 0; i < word.length; i++) {
        this_char = word.charAt(i);
        if(ignore.contains(this_char)) {
          continue; // ignore
        } else if(weights.containsKey(this_char) || matras.containsKey(this_char)
            || this_char == '़' || this_char == '्'
        ) {
          this_type = 2;
        } else if (digits.containsKey(this_char)) {
          this_type = 1;
        } else {
          this_type = 3;
        }
        if(typeof segment_type === 'undefined' || segment_type === null) {
          segment_type = this_type;
        }
        if(segment_type === this_type) {
          this_segment += this_char;
        } else {
          segments.push({segment_type: segment_type, string: this_segment});
          segment_type = this_type;
          this_segment = this_char;
        }
      }
      segments.push({segment_type: segment_type, string: this_segment});
      return segments;
    }

    function process_segments(segments) {
      // segment type in processed_word: 1 = number, 2 = characters, 3 = gibberish
      var processed_word = {segment_type: [], primary: [], secondary: []},
        possible_schwa = false, i, this_char;

      function push_weight(letter) {
        // the code further down should only pass it letters that actually exist in weights
        var weight = weights.get(letter);
        processed_word.segment_type.push(2);
        processed_word.primary.push(weight.primary);
        processed_word.secondary.push(weight.secondary);
      }

      $.each(segments, function(idx, segment) {
        if (segment.segment_type == 2) {
          for(i = 0; i < segment.string.length; i++) {
            this_char = segment.string.charAt(i);
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
        } else if(!options.ignore_all) {
          if (segment.segment_type == 1) {
            processed_word.segment_type.push(1);
            processed_word.primary.push(parseDevanagariInt(segment.string));
            processed_word.secondary.push(0);
          } else {
            processed_word.segment_type.push(3);
            processed_word.primary.push(segment); // let the built-in sort order handle this
            processed_word.secondary.push(0);
          }
        }
      });
      return processed_word;
    }

    var processed_words = $.map(words, function(word, idx) {
      var processed_word = process_segments(segment_word(word));
      processed_word.idx = idx;
      return processed_word;
    });

    var replacements = new Hashtable();
    (function construct_replacements(){
      if(options.change_anusvara) {
        var vargas = [ 'कखगघङ', 'चछजझञ', 'टठडढण', 'तथदधन', 'पफबभम'],
          anusvara_weight = weights.get('ं');
        $.each(vargas, function(idx, varga) {
          var i, char_weight, nasal_weight = weights.get(varga.charAt(varga.length - 1));
          for(i = 0; i < varga.length; i++) {
            char_weight = weights.get(varga.charAt(i));
            replacements.put([anusvara_weight, char_weight], [nasal_weight, char_weight]);
          }
        });
      }
      if(options.change_visarga) {
        var i, sibilants = 'शषस', visarga_weight = weights.get('ः'), char_weight;
        for(i = 0; i < sibilants.length; i++) {
          char_weight = weights.get(sibilants.charAt(i));
          replacements.put([visarga_weight, char_weight], [char_weight, char_weight]);
        }
      }
      if(options.separate_ksa) {
        var ksa_weight = {primary: weights.get('ळ').primary + 3, secondary: 0};
        weights.put('क्ष', ksa_weight);
        replacements.put([weights.get('क'), weights.get('ष')], [ ksa_weight ]);
      }
      if(options.separate_tra) {
        var tra_weight = {primary: weights.get('ळ').primary + 4, secondary: 0};
        weights.put('त्र', tra_weight);
        replacements.put([weights.get('त'), weights.get('र')], [ tra_weight ]);
      }
      if(options.separate_jna) {
        var jna_weight = {primary: weights.get('ळ').primary + 5, secondary: 0};
        weights.put('ज्ञ', jna_weight);
        replacements.put([weights.get('ज'), weights.get('ञ')], [ jna_weight ]);
      }
    })();

    (function perform_replacement() {
      $.each(replacements.keys(), function(idx, lhs){
        var rhs = replacements.get(lhs);
        $.each(processed_words, function(word_idx, word){
          var i, j, match, tmp_primary, tmp_secondary;
          for(i = 0; i < word.primary.length - lhs.length; i++) {
            match = true;
            for(j = 0; j < lhs.length; j++) {
              if(word.primary[i+j] !== lhs[j].primary || word.secondary[i+j] !== lhs[j].secondary) {
                match = false;
                break;
              }
            }

            if(match) {
              tmp_primary = []; tmp_secondary = [];
              for(j = 0; j < rhs.length; j++) {
                tmp_primary.push(rhs[j].primary);
                tmp_secondary.push(rhs[j].secondary);
              }
              word.primary = word.primary.slice(0, i).concat(tmp_primary).
                concat(word.primary.slice(i+lhs.length, word.primary.length));
              word.secondary = word.secondary.slice(0, i).concat(tmp_secondary).
                concat(word.secondary.slice(i+lhs.length, word.secondary.length));
            }
          }
        });
      });
    })();

    if(options.rtl) {
      $.each(processed_words, function(idx, processed_word) {
        processed_word.primary.reverse(); 
        processed_word.secondary.reverse();
      });
    }

    function compare_processed_words(word1, word2) {
      var i;
      for(i = 0; i < word1.primary.length && i < word2.primary.length; i++) {
        if(word1.segment_type[i] > word2.segment_type[i]) {
          return 1;
        } else if (word1.segment_type[i] < word2.segment_type[i]) {
          return -1;
        } else if(word1.primary[i] > word2.primary[i]) {
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

    if(options.combine_duplicates){
      var results_with_count = [], cur_result_with_count,
        cur_processed_word, this_processed_word, i;
      for(i = 0; i < result.length; i ++) {
        this_processed_word = processed_words[i];
        if(typeof cur_processed_word !== 'undefined' && 
            compare_processed_words(this_processed_word, cur_processed_word) === 0) {
          cur_result_with_count.count += 1;
        } else {
          cur_processed_word = processed_words[i];
          cur_result_with_count = { string: result[i], count: 1};
          results_with_count.push(cur_result_with_count);
        }
      }
      return results_with_count;
    } else {
      return result;
    }
  };
})(jQuery);
