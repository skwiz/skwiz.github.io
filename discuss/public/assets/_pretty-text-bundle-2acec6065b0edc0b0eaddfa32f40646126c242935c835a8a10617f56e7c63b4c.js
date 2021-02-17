define("pretty-text/pretty-text", ["exports", "pretty-text/engines/discourse-markdown-it", "discourse-common/lib/object"], function (_exports, _discourseMarkdownIt, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.registerOption = registerOption;
  _exports.buildOptions = buildOptions;
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function registerOption() {// TODO next major version deprecate this
    // if (window.console) {
    //   window.console.log("registerOption is deprecated");
    // }
  }

  function buildOptions(state) {
    var siteSettings = state.siteSettings,
        getURL = state.getURL,
        lookupAvatar = state.lookupAvatar,
        lookupPrimaryUserGroup = state.lookupPrimaryUserGroup,
        getTopicInfo = state.getTopicInfo,
        topicId = state.topicId,
        categoryHashtagLookup = state.categoryHashtagLookup,
        userId = state.userId,
        getCurrentUser = state.getCurrentUser,
        currentUser = state.currentUser,
        lookupAvatarByPostNumber = state.lookupAvatarByPostNumber,
        lookupPrimaryUserGroupByPostNumber = state.lookupPrimaryUserGroupByPostNumber,
        formatUsername = state.formatUsername,
        emojiUnicodeReplacer = state.emojiUnicodeReplacer,
        lookupUploadUrls = state.lookupUploadUrls,
        previewing = state.previewing,
        linkify = state.linkify,
        censoredRegexp = state.censoredRegexp,
        disableEmojis = state.disableEmojis,
        customEmojiTranslation = state.customEmojiTranslation;
    var features = {
      "bold-italics": true,
      "auto-link": true,
      mentions: true,
      bbcode: true,
      quote: true,
      html: true,
      "category-hashtag": true,
      onebox: true,
      linkify: linkify !== false,
      newline: !siteSettings.traditional_markdown_linebreaks
    };

    if (state.features) {
      features = (0, _object.deepMerge)(features, state.features);
    }

    var options = {
      sanitize: true,
      getURL: getURL,
      features: features,
      lookupAvatar: lookupAvatar,
      lookupPrimaryUserGroup: lookupPrimaryUserGroup,
      getTopicInfo: getTopicInfo,
      topicId: topicId,
      categoryHashtagLookup: categoryHashtagLookup,
      userId: userId,
      getCurrentUser: getCurrentUser,
      currentUser: currentUser,
      lookupAvatarByPostNumber: lookupAvatarByPostNumber,
      lookupPrimaryUserGroupByPostNumber: lookupPrimaryUserGroupByPostNumber,
      formatUsername: formatUsername,
      emojiUnicodeReplacer: emojiUnicodeReplacer,
      lookupUploadUrls: lookupUploadUrls,
      censoredRegexp: censoredRegexp,
      customEmojiTranslation: customEmojiTranslation,
      allowedHrefSchemes: siteSettings.allowed_href_schemes ? siteSettings.allowed_href_schemes.split("|") : null,
      allowedIframes: siteSettings.allowed_iframes ? siteSettings.allowed_iframes.split("|") : [],
      markdownIt: true,
      injectLineNumbersToPreview: siteSettings.enable_advanced_editor_preview_sync,
      previewing: previewing,
      disableEmojis: disableEmojis
    }; // note, this will mutate options due to the way the API is designed
    // may need a refactor

    (0, _discourseMarkdownIt.setup)(options, siteSettings, state);
    return options;
  }

  var _default = /*#__PURE__*/function () {
    function _default(opts) {
      _classCallCheck(this, _default);

      if (!opts) {
        opts = buildOptions({
          siteSettings: {}
        });
      }

      this.opts = opts;
    }

    _createClass(_default, [{
      key: "disableSanitizer",
      value: function disableSanitizer() {
        this.opts.sanitizer = this.opts.discourse.sanitizer = function (ident) {
          return ident;
        };
      }
    }, {
      key: "cook",
      value: function cook(raw) {
        if (!raw || raw.length === 0) {
          return "";
        }

        var result;
        result = (0, _discourseMarkdownIt.cook)(raw, this.opts);
        return result ? result : "";
      }
    }, {
      key: "sanitize",
      value: function sanitize(html) {
        return this.opts.sanitizer(html).trim();
      }
    }]);

    return _default;
  }();

  _exports.default = _default;
});
define("pretty-text/guid", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  /*eslint no-bitwise:0 */
  // http://stackoverflow.com/a/8809472/17174
  function _default() {
    var d = new Date().getTime();

    if (window.performance && typeof window.performance.now === "function") {
      d += performance.now(); //use high-precision timer if available
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
    });
  }
});
define("pretty-text/censored-words", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.censorFn = censorFn;
  _exports.censor = censor;

  function censorFn(regexpString, replacementLetter) {
    if (regexpString) {
      var censorRegexp = new RegExp(regexpString, "ig");
      replacementLetter = replacementLetter || "&#9632;";
      return function (text) {
        text = text.replace(censorRegexp, function (fullMatch) {
          for (var _len = arguments.length, groupMatches = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            groupMatches[_key - 1] = arguments[_key];
          }

          var stringMatch = groupMatches.find(function (g) {
            return typeof g === "string";
          });
          return fullMatch.replace(stringMatch, new Array(stringMatch.length + 1).join(replacementLetter));
        });
        return text;
      };
    }

    return function (t) {
      return t;
    };
  }

  function censor(text, censoredRegexp, replacementLetter) {
    return censorFn(censoredRegexp, replacementLetter)(text);
  }
});
define("pretty-text/emoji/data", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.replacements = _exports.translations = _exports.searchAliases = _exports.aliases = _exports.tonableEmojis = _exports.emojis = void 0;
  // DO NOT EDIT THIS FILE!!!
  // Update it by running `rake javascript:update_constants`
  var emojis = ["grinning", "grimacing", "grin", "joy", "rofl", "smiley", "grinning_face_with_smiling_eyes", "sweat_smile", "laughing", "innocent", "wink", "blush", "slightly_smiling_face", "upside_down_face", "relaxed", "yum", "relieved", "heart_eyes", "kissing_heart", "kissing", "kissing_smiling_eyes", "kissing_closed_eyes", "stuck_out_tongue_winking_eye", "stuck_out_tongue_closed_eyes", "stuck_out_tongue", "money_mouth_face", "nerd_face", "sunglasses", "clown_face", "cowboy_hat_face", "hugs", "smirk", "no_mouth", "neutral_face", "expressionless", "unamused", "roll_eyes", "thinking", "lying_face", "flushed", "disappointed", "worried", "angry", "rage", "pensive", "confused", "slightly_frowning_face", "frowning_face", "persevere", "confounded", "tired_face", "weary", "triumph", "open_mouth", "scream", "fearful", "cold_sweat", "hushed", "frowning", "frowning_face_with_open_mouth", "anguished", "cry", "disappointed_relieved", "drooling_face", "sleepy", "sweat", "sob", "dizzy_face", "astonished", "zipper_mouth_face", "nauseated_face", "sneezing_face", "mask", "face_with_thermometer", "face_with_head_bandage", "sleeping", "zzz", "poop", "smiling_imp", "imp", "japanese_ogre", "japanese_goblin", "skull", "ghost", "alien", "robot", "smiley_cat", "smile_cat", "joy_cat", "heart_eyes_cat", "smirk_cat", "kissing_cat", "scream_cat", "crying_cat_face", "pouting_cat", "raised_hands", "clap", "wave", "call_me_hand", "+1", "-1", "facepunch", "fist", "fist_left", "fist_right", "v", "ok_hand", "raised_hand", "raised_back_of_hand", "open_hands", "muscle", "pray", "handshake", "point_up", "point_up_2", "point_down", "point_left", "point_right", "fu", "raised_hand_with_fingers_splayed", "metal", "crossed_fingers", "vulcan_salute", "writing_hand", "selfie", "nail_care", "lips", "tongue", "ear", "nose", "eye", "eyes", "bust_in_silhouette", "busts_in_silhouette", "speaking_head", "baby", "boy", "girl", "man", "woman", "blonde_woman", "blonde_man", "older_man", "older_woman", "man_with_gua_pi_mao", "woman_with_turban", "man_with_turban", "policewoman", "policeman", "construction_worker_woman", "construction_worker_man", "guardswoman", "guardsman", "female_detective", "male_detective", "woman_health_worker", "man_health_worker", "woman_farmer", "man_farmer", "woman_cook", "man_cook", "woman_student", "man_student", "woman_singer", "man_singer", "woman_teacher", "man_teacher", "woman_factory_worker", "man_factory_worker", "woman_technologist", "man_technologist", "woman_office_worker", "man_office_worker", "woman_mechanic", "man_mechanic", "woman_scientist", "man_scientist", "woman_artist", "man_artist", "woman_firefighter", "man_firefighter", "woman_pilot", "man_pilot", "woman_astronaut", "man_astronaut", "woman_judge", "man_judge", "mrs_claus", "santa", "angel", "pregnant_woman", "princess", "prince", "bride_with_veil", "man_in_tuxedo", "running_woman", "running_man", "walking_woman", "walking_man", "dancer", "man_dancing", "dancing_women", "dancing_men", "couple", "two_men_holding_hands", "two_women_holding_hands", "bowing_woman", "bowing_man", "man_facepalming", "woman_facepalming", "woman_shrugging", "man_shrugging", "tipping_hand_woman", "tipping_hand_man", "no_good_woman", "no_good_man", "ok_woman", "ok_man", "raising_hand_woman", "raising_hand_man", "pouting_woman", "pouting_man", "frowning_woman", "frowning_man", "haircut_woman", "haircut_man", "massage_woman", "massage_man", "couple_with_heart_woman_man", "couple_with_heart_woman_woman", "couple_with_heart_man_man", "couplekiss_man_woman", "couplekiss_woman_woman", "couplekiss_man_man", "family_man_woman_boy", "family_man_woman_girl", "family_man_woman_girl_boy", "family_man_woman_boy_boy", "family_man_woman_girl_girl", "family_woman_woman_boy", "family_woman_woman_girl", "family_woman_woman_girl_boy", "family_woman_woman_boy_boy", "family_woman_woman_girl_girl", "family_man_man_boy", "family_man_man_girl", "family_man_man_girl_boy", "family_man_man_boy_boy", "family_man_man_girl_girl", "family_woman_boy", "family_woman_girl", "family_woman_girl_boy", "family_woman_boy_boy", "family_woman_girl_girl", "family_man_boy", "family_man_girl", "family_man_girl_boy", "family_man_boy_boy", "family_man_girl_girl", "womans_clothes", "tshirt", "jeans", "necktie", "dress", "bikini", "kimono", "lipstick", "kiss", "footprints", "high_heel", "sandal", "boot", "mans_shoe", "athletic_shoe", "womans_hat", "tophat", "rescue_worker_helmet", "mortar_board", "crown", "school_satchel", "pouch", "purse", "handbag", "briefcase", "eyeglasses", "dark_sunglasses", "ring", "closed_umbrella", "dog", "cat", "mouse", "hamster", "rabbit", "fox_face", "bear", "panda_face", "koala", "tiger", "lion", "cow", "pig", "pig_nose", "frog", "squid", "octopus", "shrimp", "monkey_face", "gorilla", "see_no_evil", "hear_no_evil", "speak_no_evil", "monkey", "chicken", "penguin", "bird", "baby_chick", "hatching_chick", "hatched_chick", "duck", "eagle", "owl", "bat", "wolf", "boar", "horse", "unicorn", "honeybee", "bug", "butterfly", "snail", "beetle", "ant", "spider", "scorpion", "crab", "snake", "lizard", "turtle", "tropical_fish", "fish", "blowfish", "dolphin", "shark", "whale", "whale2", "crocodile", "leopard", "tiger2", "water_buffalo", "ox", "cow2", "deer", "dromedary_camel", "camel", "elephant", "rhinoceros", "goat", "ram", "sheep", "racehorse", "pig2", "rat", "mouse2", "rooster", "turkey", "dove", "dog2", "poodle", "cat2", "rabbit2", "chipmunk", "paw_prints", "dragon", "dragon_face", "cactus", "christmas_tree", "evergreen_tree", "deciduous_tree", "palm_tree", "seedling", "herb", "shamrock", "four_leaf_clover", "bamboo", "tanabata_tree", "leaves", "fallen_leaf", "maple_leaf", "ear_of_rice", "hibiscus", "sunflower", "rose", "wilted_flower", "tulip", "blossom", "cherry_blossom", "bouquet", "mushroom", "chestnut", "jack_o_lantern", "shell", "spider_web", "earth_americas", "earth_africa", "earth_asia", "full_moon", "waning_gibbous_moon", "last_quarter_moon", "waning_crescent_moon", "new_moon", "waxing_crescent_moon", "first_quarter_moon", "waxing_gibbous_moon", "new_moon_with_face", "full_moon_with_face", "first_quarter_moon_with_face", "last_quarter_moon_with_face", "sun_with_face", "crescent_moon", "star", "star2", "dizzy", "sparkles", "comet", "sunny", "sun_behind_small_cloud", "partly_sunny", "sun_behind_large_cloud", "sun_behind_rain_cloud", "cloud", "cloud_with_rain", "cloud_with_lightning_and_rain", "cloud_with_lightning", "zap", "fire", "boom", "snowflake", "cloud_with_snow", "snowman", "snowman_with_snow", "wind_face", "dash", "tornado", "fog", "open_umbrella", "umbrella", "droplet", "sweat_drops", "ocean", "green_apple", "apple", "pear", "tangerine", "lemon", "banana", "watermelon", "grapes", "strawberry", "melon", "cherries", "peach", "pineapple", "kiwi_fruit", "avocado", "tomato", "eggplant", "cucumber", "carrot", "hot_pepper", "potato", "corn", "sweet_potato", "peanuts", "honey_pot", "croissant", "bread", "baguette_bread", "cheese", "egg", "bacon", "pancakes", "poultry_leg", "meat_on_bone", "fried_shrimp", "fried_egg", "hamburger", "fries", "stuffed_flatbread", "hotdog", "pizza", "spaghetti", "taco", "burrito", "green_salad", "shallow_pan_of_food", "ramen", "stew", "fish_cake", "sushi", "bento", "curry", "rice_ball", "rice", "rice_cracker", "oden", "dango", "shaved_ice", "ice_cream", "icecream", "cake", "birthday", "custard", "candy", "lollipop", "chocolate_bar", "popcorn", "doughnut", "cookie", "milk_glass", "beer", "beers", "clinking_glasses", "wine_glass", "tumbler_glass", "cocktail", "tropical_drink", "champagne", "sake", "tea", "coffee", "baby_bottle", "spoon", "fork_and_knife", "plate_with_cutlery", "soccer", "basketball", "football", "baseball", "tennis", "volleyball", "rugby_football", "8ball", "golf", "golfing_woman", "golfing_man", "ping_pong", "badminton", "goal_net", "ice_hockey", "field_hockey", "cricket_bat_and_ball", "ski", "skier", "snowboarder", "person_fencing", "women_wrestling", "men_wrestling", "woman_cartwheeling", "man_cartwheeling", "woman_playing_handball", "man_playing_handball", "ice_skate", "bow_and_arrow", "fishing_pole_and_fish", "boxing_glove", "martial_arts_uniform", "rowing_woman", "rowing_man", "swimming_woman", "swimming_man", "woman_playing_water_polo", "man_playing_water_polo", "surfing_woman", "surfing_man", "bath", "basketball_woman", "basketball_man", "weight_lifting_woman", "weight_lifting_man", "biking_woman", "biking_man", "mountain_biking_woman", "mountain_biking_man", "horse_racing", "business_suit_levitating", "trophy", "running_shirt_with_sash", "medal_sports", "medal_military", "1st_place_medal", "2nd_place_medal", "3rd_place_medal", "reminder_ribbon", "rosette", "ticket", "tickets", "performing_arts", "art", "circus_tent", "woman_juggling", "man_juggling", "microphone", "headphones", "musical_score", "musical_keyboard", "drum", "saxophone", "trumpet", "guitar", "violin", "clapper", "video_game", "space_invader", "dart", "game_die", "slot_machine", "bowling", "red_car", "taxi", "blue_car", "bus", "trolleybus", "racing_car", "police_car", "ambulance", "fire_engine", "minibus", "truck", "articulated_lorry", "tractor", "kick_scooter", "motorcycle", "bike", "motor_scooter", "rotating_light", "oncoming_police_car", "oncoming_bus", "oncoming_automobile", "oncoming_taxi", "aerial_tramway", "mountain_cableway", "suspension_railway", "railway_car", "train", "monorail", "bullettrain_side", "bullettrain_front", "light_rail", "mountain_railway", "steam_locomotive", "train2", "metro", "tram", "station", "helicopter", "small_airplane", "airplane", "flight_departure", "flight_arrival", "sailboat", "motor_boat", "speedboat", "ferry", "passenger_ship", "rocket", "artificial_satellite", "seat", "canoe", "anchor", "construction", "fuelpump", "busstop", "vertical_traffic_light", "traffic_light", "checkered_flag", "ship", "ferris_wheel", "roller_coaster", "carousel_horse", "building_construction", "foggy", "tokyo_tower", "factory", "fountain", "rice_scene", "mountain", "mountain_snow", "mount_fuji", "volcano", "japan", "camping", "tent", "national_park", "motorway", "railway_track", "sunrise", "sunrise_over_mountains", "desert", "beach_umbrella", "desert_island", "city_sunrise", "city_sunset", "cityscape", "night_with_stars", "bridge_at_night", "milky_way", "stars", "sparkler", "fireworks", "rainbow", "houses", "european_castle", "japanese_castle", "stadium", "statue_of_liberty", "house", "house_with_garden", "derelict_house", "office", "department_store", "post_office", "european_post_office", "hospital", "bank", "hotel", "convenience_store", "school", "love_hotel", "wedding", "classical_building", "church", "mosque", "synagogue", "kaaba", "shinto_shrine", "watch", "iphone", "calling", "computer", "keyboard", "desktop_computer", "printer", "computer_mouse", "trackball", "joystick", "clamp", "minidisc", "floppy_disk", "cd", "dvd", "vhs", "camera", "camera_flash", "video_camera", "movie_camera", "film_projector", "film_strip", "telephone_receiver", "phone", "pager", "fax", "tv", "radio", "studio_microphone", "level_slider", "control_knobs", "stopwatch", "timer_clock", "alarm_clock", "mantelpiece_clock", "hourglass_flowing_sand", "hourglass", "satellite", "battery", "electric_plug", "bulb", "flashlight", "candle", "wastebasket", "oil_drum", "money_with_wings", "dollar", "yen", "euro", "pound", "moneybag", "credit_card", "gem", "balance_scale", "wrench", "hammer", "hammer_and_pick", "hammer_and_wrench", "pick", "nut_and_bolt", "gear", "chains", "gun", "bomb", "hocho", "dagger", "crossed_swords", "shield", "smoking", "skull_and_crossbones", "coffin", "funeral_urn", "amphora", "crystal_ball", "prayer_beads", "barber", "alembic", "telescope", "microscope", "hole", "pill", "syringe", "thermometer", "label", "bookmark", "toilet", "shower", "bathtub", "key", "old_key", "couch_and_lamp", "sleeping_bed", "bed", "door", "bellhop_bell", "framed_picture", "world_map", "parasol_on_ground", "moyai", "shopping", "shopping_cart", "balloon", "flags", "ribbon", "gift", "confetti_ball", "tada", "dolls", "wind_chime", "crossed_flags", "izakaya_lantern", "email", "envelope_with_arrow", "incoming_envelope", "e-mail", "love_letter", "postbox", "mailbox_closed", "mailbox", "mailbox_with_mail", "mailbox_with_no_mail", "package", "postal_horn", "inbox_tray", "outbox_tray", "scroll", "page_with_curl", "bookmark_tabs", "bar_chart", "chart_with_upwards_trend", "chart_with_downwards_trend", "page_facing_up", "date", "calendar", "spiral_calendar", "card_index", "card_file_box", "ballot_box", "file_cabinet", "clipboard", "spiral_notepad", "file_folder", "open_file_folder", "card_index_dividers", "newspaper_roll", "newspaper", "notebook", "closed_book", "green_book", "blue_book", "orange_book", "notebook_with_decorative_cover", "ledger", "books", "open_book", "link", "paperclip", "paperclips", "scissors", "triangular_ruler", "straight_ruler", "pushpin", "round_pushpin", "triangular_flag_on_post", "white_flag", "black_flag", "rainbow_flag", "closed_lock_with_key", "lock", "unlock", "lock_with_ink_pen", "pen", "fountain_pen", "black_nib", "memo", "pencil2", "crayon", "paintbrush", "mag", "mag_right", "heart", "yellow_heart", "green_heart", "blue_heart", "purple_heart", "black_heart", "broken_heart", "heavy_heart_exclamation", "two_hearts", "revolving_hearts", "heartbeat", "heartpulse", "sparkling_heart", "cupid", "gift_heart", "heart_decoration", "peace_symbol", "latin_cross", "star_and_crescent", "om", "wheel_of_dharma", "star_of_david", "six_pointed_star", "menorah", "yin_yang", "orthodox_cross", "place_of_worship", "ophiuchus", "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpius", "sagittarius", "capricorn", "aquarius", "pisces", "id", "atom_symbol", "u7a7a", "u5272", "radioactive", "biohazard", "mobile_phone_off", "vibration_mode", "u6709", "u7121", "u7533", "u55b6", "u6708", "eight_pointed_black_star", "vs", "accept", "white_flower", "ideograph_advantage", "secret", "congratulations", "u5408", "u6e80", "u7981", "a", "b", "ab", "cl", "o2", "sos", "no_entry", "name_badge", "no_entry_sign", "x", "o", "stop_sign", "anger", "hotsprings", "no_pedestrians", "do_not_litter", "no_bicycles", "non-potable_water", "underage", "no_mobile_phones", "exclamation", "grey_exclamation", "question", "grey_question", "bangbang", "interrobang", "100", "low_brightness", "high_brightness", "trident", "fleur_de_lis", "part_alternation_mark", "warning", "children_crossing", "beginner", "recycle", "u6307", "chart", "sparkle", "eight_spoked_asterisk", "negative_squared_cross_mark", "white_check_mark", "diamond_shape_with_a_dot_inside", "cyclone", "loop", "globe_with_meridians", "m", "atm", "sa", "passport_control", "customs", "baggage_claim", "left_luggage", "wheelchair", "no_smoking", "wc", "parking", "potable_water", "mens", "womens", "baby_symbol", "restroom", "put_litter_in_its_place", "cinema", "signal_strength", "koko", "ng", "ok", "up", "cool", "new", "free", "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "keycap_ten", "asterisk", "1234", "arrow_forward", "pause_button", "next_track_button", "stop_button", "record_button", "play_or_pause_button", "previous_track_button", "fast_forward", "rewind", "twisted_rightwards_arrows", "repeat", "repeat_one", "arrow_backward", "arrow_up_small", "arrow_down_small", "arrow_double_up", "arrow_double_down", "arrow_right", "arrow_left", "arrow_up", "arrow_down", "arrow_upper_right", "arrow_lower_right", "arrow_lower_left", "arrow_upper_left", "arrow_up_down", "left_right_arrow", "arrows_counterclockwise", "arrow_right_hook", "leftwards_arrow_with_hook", "arrow_heading_up", "arrow_heading_down", "hash", "information_source", "abc", "abcd", "capital_abcd", "symbols", "musical_note", "notes", "wavy_dash", "curly_loop", "heavy_check_mark", "arrows_clockwise", "heavy_plus_sign", "heavy_minus_sign", "heavy_division_sign", "heavy_multiplication_x", "heavy_dollar_sign", "currency_exchange", "copyright", "registered", "tm", "end", "back", "on", "top", "soon", "ballot_box_with_check", "radio_button", "white_circle", "black_circle", "red_circle", "large_blue_circle", "small_orange_diamond", "small_blue_diamond", "large_orange_diamond", "large_blue_diamond", "small_red_triangle", "black_small_square", "white_small_square", "black_large_square", "white_large_square", "small_red_triangle_down", "black_medium_square", "white_medium_square", "black_medium_small_square", "white_medium_small_square", "black_square_button", "white_square_button", "speaker", "sound", "loud_sound", "mute", "mega", "loudspeaker", "bell", "no_bell", "black_joker", "mahjong", "spades", "clubs", "hearts", "diamonds", "flower_playing_cards", "thought_balloon", "right_anger_bubble", "speech_balloon", "left_speech_bubble", "clock1", "clock2", "clock3", "clock4", "clock5", "clock6", "clock7", "clock8", "clock9", "clock10", "clock11", "clock12", "clock130", "clock230", "clock330", "clock430", "clock530", "clock630", "clock730", "clock830", "clock930", "clock1030", "clock1130", "clock1230", "afghanistan", "aland_islands", "albania", "algeria", "american_samoa", "andorra", "angola", "anguilla", "antarctica", "antigua_barbuda", "argentina", "armenia", "aruba", "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados", "belarus", "belgium", "belize", "benin", "bermuda", "bhutan", "bolivia", "caribbean_netherlands", "bosnia_herzegovina", "botswana", "brazil", "british_indian_ocean_territory", "british_virgin_islands", "brunei", "bulgaria", "burkina_faso", "burundi", "cape_verde", "cambodia", "cameroon", "canada", "canary_islands", "cayman_islands", "central_african_republic", "chad", "chile", "cn", "christmas_island", "cocos_islands", "colombia", "comoros", "congo_brazzaville", "congo_kinshasa", "cook_islands", "costa_rica", "croatia", "cuba", "curacao", "cyprus", "czech_republic", "denmark", "djibouti", "dominica", "dominican_republic", "ecuador", "egypt", "el_salvador", "equatorial_guinea", "eritrea", "estonia", "ethiopia", "eu", "falkland_islands", "faroe_islands", "fiji", "finland", "fr", "french_guiana", "french_polynesia", "french_southern_territories", "gabon", "gambia", "georgia", "de", "ghana", "gibraltar", "greece", "greenland", "grenada", "guadeloupe", "guam", "guatemala", "guernsey", "guinea", "guinea_bissau", "guyana", "haiti", "honduras", "hong_kong", "hungary", "iceland", "india", "indonesia", "iran", "iraq", "ireland", "isle_of_man", "israel", "it", "cote_divoire", "jamaica", "jp", "jersey", "jordan", "kazakhstan", "kenya", "kiribati", "kosovo", "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya", "liechtenstein", "lithuania", "luxembourg", "macau", "macedonia", "madagascar", "malawi", "malaysia", "maldives", "mali", "malta", "marshall_islands", "martinique", "mauritania", "mauritius", "mayotte", "mexico", "micronesia", "moldova", "monaco", "mongolia", "montenegro", "montserrat", "morocco", "mozambique", "myanmar", "namibia", "nauru", "nepal", "netherlands", "new_caledonia", "new_zealand", "nicaragua", "niger", "nigeria", "niue", "norfolk_island", "northern_mariana_islands", "north_korea", "norway", "oman", "pakistan", "palau", "palestinian_territories", "panama", "papua_new_guinea", "paraguay", "peru", "philippines", "pitcairn_islands", "poland", "portugal", "puerto_rico", "qatar", "reunion", "romania", "ru", "rwanda", "st_barthelemy", "st_helena", "st_kitts_nevis", "st_lucia", "st_pierre_miquelon", "st_vincent_grenadines", "samoa", "san_marino", "sao_tome_principe", "saudi_arabia", "senegal", "serbia", "seychelles", "sierra_leone", "singapore", "sint_maarten", "slovakia", "slovenia", "solomon_islands", "somalia", "south_africa", "south_georgia_south_sandwich_islands", "kr", "south_sudan", "es", "sri_lanka", "sudan", "suriname", "swaziland", "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand", "timor_leste", "togo", "tokelau", "tonga", "trinidad_tobago", "tunisia", "tr", "turkmenistan", "turks_caicos_islands", "tuvalu", "uganda", "ukraine", "united_arab_emirates", "uk", "us", "us_virgin_islands", "uruguay", "uzbekistan", "vanuatu", "vatican_city", "venezuela", "vietnam", "wallis_futuna", "western_sahara", "yemen", "zambia", "zimbabwe", "star_struck", "face_with_raised_eyebrow", "exploding_head", "crazy_face", "face_with_symbols_over_mouth", "face_vomiting", "shushing_face", "face_with_hand_over_mouth", "face_with_monocle", "child", "adult", "older_adult", "woman_with_headscarf", "bearded_person", "breast_feeding", "mage", "woman_mage", "fairy", "vampire", "mermaid", "merman", "elf", "genie", "woman_genie", "zombie", "woman_zombie", "person_in_steamy_room", "woman_in_steamy_room", "person_climbing", "woman_climbing", "person_in_lotus_position", "woman_in_lotus_position", "love_you_gesture", "palms_up_together", "brain", "orange_heart", "scarf", "gloves", "coat", "socks", "billed_cap", "zebra", "giraffe", "hedgehog", "sauropod", "t_rex", "cricket", "coconut", "broccoli", "pretzel", "cut_of_meat", "sandwich", "bowl_with_spoon", "canned_food", "dumpling", "fortune_cookie", "takeout_box", "pie", "cup_with_straw", "chopsticks", "flying_saucer", "sled", "curling_stone", "svalbard_and_jan_mayen", "st_martin", "us_outlying_islands", "tristan_da_cunha", "heard_and_mc_donald_islands", "ceuta_and_melilla", "diego_garcia", "ascension_island", "bouvet_island", "clipperton_island", "united_nations", "smiling_face_with_three_hearts", "hot_face", "cold_face", "partying_face", "woozy_face", "pleading_face", "man_red_haired", "man_curly_haired", "man_white_haired", "man_bald", "woman_red_haired", "woman_curly_haired", "woman_white_haired", "woman_bald", "superhero", "man_superhero", "woman_superhero", "supervillain", "woman_supervillain", "man_supervillain", "leg", "foot", "bone", "tooth", "goggles", "lab_coat", "hiking_boot", "flat_shoe", "raccoon", "llama", "hippopotamus", "kangaroo", "badger", "swan", "peacock", "parrot", "lobster", "mosquito", "microbe", "mango", "leafy_green", "bagel", "salt", "moon_cake", "cupcake", "compass", "brick", "skateboard", "luggage", "firecracker", "red_gift_envelope", "softball", "flying_disc", "lacrosse", "nazar_amulet", "jigsaw", "teddy_bear", "chess_pawn", "thread", "yarn", "abacus", "receipt", "toolbox", "magnet", "test_tube", "petri_dish", "dna", "lotion_bottle", "safety_pin", "broom", "basket", "roll_of_toilet_paper", "soap", "sponge", "fire_extinguisher", "infinity", "pirate_flag", "waffle", "otter", "sloth", "ice_cube", "ringer_planet", "flamingo", "yawning_face", "pinching_hand", "service_dog", "orangutan", "auto_rickshaw", "parachute", "yo-yo", "kite", "brown_square", "purple_square", "blue_square", "green_square", "yellow_square", "orange_square", "red_square", "brown_circle", "purple_circle", "green_circle", "yellow_circle", "orange_circle", "razor", "chair", "stethoscope", "adhesive_bandage", "drop_of_blood", "probing_cane", "axe", "diya_lamp", "banjo", "ballet_shoes", "shorts", "briefs", "one_piece_swimsuit", "sari", "safety_vest", "diving_mask", "motorized_wheelchair", "manual_wheelchair", "hindu_temple", "maté", "beverage_box", "oyster", "butter", "falafel", "onion", "garlic", "skunk", "guide_dog", "people_holding_hands", "woman_in_manual_wheelchair", "man_in_manual_wheelchair", "woman_in_motorized_wheelchair", "man_in_motorized_wheelchair", "woman_with_probing_cane", "man_with_probing_cane", "woman_kneeling", "man_kneeling", "man_standing", "woman_standing", "deaf_woman", "deaf_man", "hear_with_hearing_aid", "mechanical_leg", "mechanical_arm", "white_heart", "brown_heart", "transgender_flag"];
  _exports.emojis = emojis;
  var tonableEmojis = ["raised_hands", "clap", "wave", "call_me_hand", "+1", "-1", "facepunch", "fist", "fist_left", "fist_right", "v", "ok_hand", "raised_hand", "raised_back_of_hand", "open_hands", "muscle", "pray", "point_up", "point_up_2", "point_down", "point_left", "point_right", "fu", "raised_hand_with_fingers_splayed", "metal", "crossed_fingers", "vulcan_salute", "writing_hand", "selfie", "nail_care", "ear", "nose", "baby", "boy", "girl", "man", "woman", "blonde_woman", "blonde_man", "older_man", "older_woman", "man_with_gua_pi_mao", "woman_with_turban", "man_with_turban", "policewoman", "policeman", "construction_worker_woman", "construction_worker_man", "guardswoman", "guardsman", "male_detective", "woman_health_worker", "man_health_worker", "woman_farmer", "man_farmer", "woman_cook", "man_cook", "woman_student", "man_student", "woman_singer", "man_singer", "woman_teacher", "man_teacher", "woman_factory_worker", "man_factory_worker", "woman_technologist", "man_technologist", "woman_office_worker", "man_office_worker", "woman_mechanic", "man_mechanic", "woman_scientist", "man_scientist", "woman_artist", "man_artist", "woman_firefighter", "man_firefighter", "woman_pilot", "man_pilot", "woman_astronaut", "man_astronaut", "woman_judge", "man_judge", "mrs_claus", "santa", "angel", "pregnant_woman", "princess", "prince", "bride_with_veil", "man_in_tuxedo", "running_woman", "running_man", "walking_woman", "walking_man", "dancer", "man_dancing", "bowing_woman", "bowing_man", "man_facepalming", "woman_facepalming", "woman_shrugging", "man_shrugging", "tipping_hand_woman", "tipping_hand_man", "no_good_woman", "no_good_man", "ok_woman", "ok_man", "raising_hand_woman", "raising_hand_man", "pouting_woman", "pouting_man", "frowning_woman", "frowning_man", "haircut_woman", "haircut_man", "massage_woman", "massage_man", "golfing_man", "snowboarder", "woman_cartwheeling", "man_cartwheeling", "woman_playing_handball", "man_playing_handball", "rowing_woman", "rowing_man", "swimming_woman", "swimming_man", "woman_playing_water_polo", "man_playing_water_polo", "surfing_woman", "surfing_man", "bath", "basketball_man", "weight_lifting_man", "biking_woman", "biking_man", "mountain_biking_woman", "mountain_biking_man", "horse_racing", "business_suit_levitating", "woman_juggling", "man_juggling", "sleeping_bed", "child", "adult", "older_adult", "woman_with_headscarf", "bearded_person", "breast_feeding", "mage", "woman_mage", "fairy", "vampire", "mermaid", "merman", "elf", "person_in_steamy_room", "woman_in_steamy_room", "person_climbing", "woman_climbing", "person_in_lotus_position", "woman_in_lotus_position", "love_you_gesture", "palms_up_together"];
  _exports.tonableEmojis = tonableEmojis;
  var aliases = {
    right_anger_bubble: ["anger_right"],
    ballot_box: ["ballot_box_with_ballot"],
    basketball_man: ["basketball_player", "person_with_ball"],
    beach_umbrella: ["umbrella_on_ground", "beach", "beach_with_umbrella"],
    parasol_on_ground: ["umbrella_on_ground"],
    bellhop_bell: ["bellhop"],
    biohazard: ["biohazard_sign"],
    bow_and_arrow: ["archery"],
    spiral_calendar: ["calendar_spiral", "spiral_calendar_pad"],
    card_file_box: ["card_box"],
    champagne: ["bottle_with_popping_cork"],
    cheese: ["cheese_wedge"],
    city_sunset: ["city_dusk"],
    couch_and_lamp: ["couch"],
    crayon: ["lower_left_crayon"],
    cricket_bat_and_ball: ["cricket_bat_ball"],
    latin_cross: ["cross"],
    dagger: ["dagger_knife"],
    desktop_computer: ["desktop"],
    card_index_dividers: ["dividers"],
    dove: ["dove_of_peace"],
    footprints: ["feet"],
    fire: ["flame"],
    black_flag: ["flag_black", "waving_black_flag"],
    cn: ["flag_cn"],
    de: ["flag_de"],
    es: ["flag_es"],
    fr: ["flag_fr"],
    uk: ["gb", "flag_gb"],
    it: ["flag_it"],
    jp: ["flag_jp"],
    kr: ["flag_kr"],
    ru: ["flag_ru"],
    us: ["flag_us"],
    white_flag: ["flag_white", "waving_white_flag"],
    plate_with_cutlery: ["fork_knife_plate", "fork_and_knife_with_plate"],
    framed_picture: ["frame_photo", "frame_with_picture"],
    hammer_and_pick: ["hammer_pick"],
    heavy_heart_exclamation: ["heart_exclamation", "heavy_heart_exclamation_mark_ornament"],
    houses: ["homes", "house_buildings"],
    hotdog: ["hot_dog"],
    derelict_house: ["house_abandoned", "derelict_house_building"],
    desert_island: ["island"],
    old_key: ["key2"],
    laughing: ["satisfied"],
    business_suit_levitating: ["levitate", "man_in_business_suit_levitating"],
    weight_lifting_man: ["lifter", "weight_lifter"],
    medal_sports: ["medal", "sports_medal"],
    metal: ["sign_of_the_horns"],
    fu: ["middle_finger", "reversed_hand_with_middle_finger_extended"],
    motorcycle: ["racing_motorcycle"],
    mountain_snow: ["snow_capped_mountain"],
    newspaper_roll: ["newspaper2", "rolled_up_newspaper"],
    spiral_notepad: ["notepad_spiral", "spiral_note_pad"],
    oil_drum: ["oil"],
    older_woman: ["grandma"],
    paintbrush: ["lower_left_paintbrush"],
    paperclips: ["linked_paperclips"],
    pause_button: ["double_vertical_bar"],
    peace_symbol: ["peace"],
    fountain_pen: ["pen_fountain", "lower_left_fountain_pen"],
    ping_pong: ["table_tennis"],
    place_of_worship: ["worship_symbol"],
    poop: ["shit", "hankey", "poo"],
    radioactive: ["radioactive_sign"],
    railway_track: ["railroad_track"],
    robot: ["robot_face"],
    skull: ["skeleton"],
    skull_and_crossbones: ["skull_crossbones"],
    speaking_head: ["speaking_head_in_silhouette"],
    male_detective: ["spy", "sleuth_or_spy"],
    thinking: ["thinking_face"],
    "-1": ["thumbsdown"],
    "+1": ["thumbsup"],
    cloud_with_lightning_and_rain: ["thunder_cloud_rain", "thunder_cloud_and_rain"],
    tickets: ["admission_tickets"],
    next_track_button: ["track_next", "next_track"],
    previous_track_button: ["track_previous", "previous_track"],
    unicorn: ["unicorn_face"],
    funeral_urn: ["urn"],
    sun_behind_large_cloud: ["white_sun_cloud", "white_sun_behind_cloud"],
    sun_behind_rain_cloud: ["white_sun_rain_cloud", "white_sun_behind_cloud_with_rain"],
    grinning_face_with_smiling_eyes: ["smile"],
    partly_sunny: ["white_sun_small_cloud", "white_sun_with_small_cloud"],
    open_umbrella: ["umbrella2"],
    hammer_and_wrench: ["tools"],
    face_with_thermometer: ["thermometer_face"],
    timer_clock: ["timer"],
    keycap_ten: ["ten"],
    memo: ["pencil"],
    rescue_worker_helmet: ["helmet_with_cross", "helmet_with_white_cross"],
    slightly_smiling_face: ["slightly_smiling", "slight_smile"],
    construction_worker_man: ["construction_worker"],
    upside_down_face: ["upside_down"],
    money_mouth_face: ["money_mouth"],
    nerd_face: ["nerd"],
    hugs: ["hugging", "hugging_face"],
    roll_eyes: ["rolling_eyes", "face_with_rolling_eyes"],
    slightly_frowning_face: ["slight_frown"],
    frowning_face: ["frowning2", "white_frowning_face"],
    zipper_mouth_face: ["zipper_mouth"],
    face_with_head_bandage: ["head_bandage"],
    raised_hand_with_fingers_splayed: ["hand_splayed"],
    raised_hand: ["hand"],
    vulcan_salute: ["vulcan", "raised_hand_with_part_between_middle_and_ring_fingers"],
    policeman: ["cop"],
    running_man: ["runner"],
    walking_man: ["walking"],
    bowing_man: ["bow"],
    no_good_woman: ["no_good"],
    raising_hand_woman: ["raising_hand"],
    pouting_woman: ["person_with_pouting_face"],
    frowning_woman: ["person_frowning"],
    haircut_woman: ["haircut"],
    massage_woman: ["massage"],
    tshirt: ["shirt"],
    biking_man: ["bicyclist"],
    mountain_biking_man: ["mountain_bicyclist"],
    passenger_ship: ["cruise_ship"],
    motor_boat: ["motorboat", "boat"],
    flight_arrival: ["airplane_arriving"],
    flight_departure: ["airplane_departure"],
    small_airplane: ["airplane_small"],
    racing_car: ["race_car"],
    family_man_woman_boy_boy: ["family_man_woman_boys"],
    family_man_woman_girl_girl: ["family_man_woman_girls"],
    family_woman_woman_boy: ["family_women_boy"],
    family_woman_woman_girl: ["family_women_girl"],
    family_woman_woman_girl_boy: ["family_women_girl_boy"],
    family_woman_woman_boy_boy: ["family_women_boys"],
    family_woman_woman_girl_girl: ["family_women_girls"],
    family_man_man_boy: ["family_men_boy"],
    family_man_man_girl: ["family_men_girl"],
    family_man_man_girl_boy: ["family_men_girl_boy"],
    family_man_man_boy_boy: ["family_men_boys"],
    family_man_man_girl_girl: ["family_men_girls"],
    cloud_with_lightning: ["cloud_lightning"],
    tornado: ["cloud_tornado", "cloud_with_tornado"],
    cloud_with_rain: ["cloud_rain"],
    cloud_with_snow: ["cloud_snow"],
    asterisk: ["keycap_star"],
    studio_microphone: ["microphone2"],
    medal_military: ["military_medal"],
    couple_with_heart_woman_woman: ["female_couple_with_heart"],
    couple_with_heart_man_man: ["male_couple_with_heart"],
    couplekiss_woman_woman: ["female_couplekiss"],
    couplekiss_man_man: ["male_couplekiss"],
    honeybee: ["bee"],
    lion: ["lion_face"],
    artificial_satellite: ["satellite_orbital"],
    computer_mouse: ["mouse_three_button", "three_button_mouse"],
    hocho: ["knife"],
    swimming_man: ["swimmer"],
    wind_face: ["wind_blowing_face"],
    golfing_man: ["golfer"],
    facepunch: ["punch"],
    building_construction: ["construction_site"],
    family_man_woman_girl_boy: ["family"],
    ice_hockey: ["hockey"],
    snowman_with_snow: ["snowman2"],
    play_or_pause_button: ["play_pause"],
    film_projector: ["projector"],
    shopping: ["shopping_bags"],
    open_book: ["book"],
    national_park: ["park"],
    world_map: ["map"],
    pen: ["pen_ballpoint", "lower_left_ballpoint_pen"],
    email: ["envelope", "e-mail"],
    phone: ["telephone"],
    atom_symbol: ["atom"],
    mantelpiece_clock: ["clock"],
    camera_flash: ["camera_with_flash"],
    film_strip: ["film_frames"],
    balance_scale: ["scales"],
    surfing_man: ["surfer"],
    couplekiss_man_woman: ["couplekiss"],
    couple_with_heart_woman_man: ["couple_with_heart"],
    clamp: ["compression"],
    dancing_women: ["dancers"],
    blonde_man: ["person_with_blond_hair"],
    sleeping_bed: ["sleeping_accommodation"],
    om: ["om_symbol"],
    tipping_hand_woman: ["information_desk_person"],
    rowing_man: ["rowboat"],
    new_moon: ["moon"],
    oncoming_automobile: ["car", "automobile"],
    fleur_de_lis: ["fleur-de-lis"],
    face_vomiting: ["puke"]
  };
  _exports.aliases = aliases;
  var searchAliases = {
    sad: ["frowning_face", "slightly_frowning_face", "sob", "crying_cat_face", "cry"],
    cry: ["sob"]
  };
  _exports.searchAliases = searchAliases;
  var translations = {
    ":)": "slight_smile",
    ":-)": "slight_smile",
    "^_^": "slight_smile",
    "^__^": "slight_smile",
    ":(": "frowning",
    ":-(": "frowning",
    ";)": "wink",
    ";-)": "wink",
    ":'(": "cry",
    ":'-(": "cry",
    ":-'(": "cry",
    ":p": "stuck_out_tongue",
    ":P": "stuck_out_tongue",
    ":-P": "stuck_out_tongue",
    ":O": "open_mouth",
    ":-O": "open_mouth",
    ":D": "smiley",
    ":-D": "smiley",
    ":|": "expressionless",
    ":-|": "expressionless",
    ":/": "confused",
    "8-)": "sunglasses",
    ";P": "stuck_out_tongue_winking_eye",
    ";-P": "stuck_out_tongue_winking_eye",
    ":$": "blush",
    ":-$": "blush"
  };
  _exports.translations = translations;
  var replacements = {
    "😀": "grinning",
    "😬": "grimacing",
    "😁": "grin",
    "😂": "joy",
    "🤣": "rofl",
    "😃": "smiley",
    "😄": "grinning_face_with_smiling_eyes",
    "😅": "sweat_smile",
    "😆": "laughing",
    "😇": "innocent",
    "😉": "wink",
    "😊": "blush",
    "🙂": "slightly_smiling_face",
    "🙃": "upside_down_face",
    "☺": "slight_smile",
    "😋": "yum",
    "😌": "relieved",
    "😍": "heart_eyes",
    "😘": "kissing_heart",
    "😗": "kissing",
    "😙": "kissing_smiling_eyes",
    "😚": "kissing_closed_eyes",
    "😜": "stuck_out_tongue_winking_eye",
    "😝": "stuck_out_tongue_closed_eyes",
    "😛": "stuck_out_tongue",
    "🤑": "money_mouth_face",
    "🤓": "nerd_face",
    "😎": "sunglasses",
    "🤡": "clown_face",
    "🤠": "cowboy_hat_face",
    "🤗": "hugs",
    "😏": "smirk",
    "😶": "no_mouth",
    "😐": "neutral_face",
    "😑": "expressionless",
    "😒": "unamused",
    "🙄": "roll_eyes",
    "🤔": "thinking",
    "🤥": "lying_face",
    "😳": "flushed",
    "😞": "disappointed",
    "😟": "worried",
    "😠": "angry",
    "😡": "rage",
    "😔": "pensive",
    "😕": "confused",
    "☹️": "slightly_frowning_face",
    "🙁": "frowning",
    "😣": "persevere",
    "😖": "confounded",
    "😫": "tired_face",
    "😩": "weary",
    "😤": "triumph",
    "😮": "open_mouth",
    "😱": "scream",
    "😨": "fearful",
    "😰": "cold_sweat",
    "😯": "hushed",
    "😦": "frowning_face_with_open_mouth",
    "😧": "anguished",
    "😢": "cry",
    "😥": "disappointed_relieved",
    "🤤": "drooling_face",
    "😪": "sleepy",
    "😓": "sweat",
    "😭": "sob",
    "😵": "dizzy_face",
    "😲": "astonished",
    "🤐": "zipper_mouth_face",
    "🤢": "nauseated_face",
    "🤧": "sneezing_face",
    "😷": "mask",
    "🤒": "face_with_thermometer",
    "🤕": "face_with_head_bandage",
    "😴": "sleeping",
    "💤": "zzz",
    "💩": "poop",
    "😈": "smiling_imp",
    "👿": "imp",
    "👹": "japanese_ogre",
    "👺": "japanese_goblin",
    "💀": "skull",
    "👻": "ghost",
    "👽": "alien",
    "🤖": "robot",
    "😺": "smiley_cat",
    "😸": "smile_cat",
    "😹": "joy_cat",
    "😻": "heart_eyes_cat",
    "😼": "smirk_cat",
    "😽": "kissing_cat",
    "🙀": "scream_cat",
    "😿": "crying_cat_face",
    "😾": "pouting_cat",
    "🙌": "raised_hands",
    "🙌🏻": "raised_hands:t2",
    "🙌🏼": "raised_hands:t3",
    "🙌🏽": "raised_hands:t4",
    "🙌🏾": "raised_hands:t5",
    "🙌🏿": "raised_hands:t6",
    "👏": "clap",
    "👏🏻": "clap:t2",
    "👏🏼": "clap:t3",
    "👏🏽": "clap:t4",
    "👏🏾": "clap:t5",
    "👏🏿": "clap:t6",
    "👋": "wave",
    "👋🏻": "wave:t2",
    "👋🏼": "wave:t3",
    "👋🏽": "wave:t4",
    "👋🏾": "wave:t5",
    "👋🏿": "wave:t6",
    "🤙": "call_me_hand",
    "🤙🏻": "call_me_hand:t2",
    "🤙🏼": "call_me_hand:t3",
    "🤙🏽": "call_me_hand:t4",
    "🤙🏾": "call_me_hand:t5",
    "🤙🏿": "call_me_hand:t6",
    "👍": "+1",
    "👍🏻": "+1:t2",
    "👍🏼": "+1:t3",
    "👍🏽": "+1:t4",
    "👍🏾": "+1:t5",
    "👍🏿": "+1:t6",
    "👎": "-1",
    "👎🏻": "-1:t2",
    "👎🏼": "-1:t3",
    "👎🏽": "-1:t4",
    "👎🏾": "-1:t5",
    "👎🏿": "-1:t6",
    "👊": "facepunch",
    "👊🏻": "facepunch:t2",
    "👊🏼": "facepunch:t3",
    "👊🏽": "facepunch:t4",
    "👊🏾": "facepunch:t5",
    "👊🏿": "facepunch:t6",
    "✊": "fist",
    "✊🏻": "fist:t2",
    "✊🏼": "fist:t3",
    "✊🏽": "fist:t4",
    "✊🏾": "fist:t5",
    "✊🏿": "fist:t6",
    "🤛": "fist_left",
    "🤛🏻": "fist_left:t2",
    "🤛🏼": "fist_left:t3",
    "🤛🏽": "fist_left:t4",
    "🤛🏾": "fist_left:t5",
    "🤛🏿": "fist_left:t6",
    "🤜": "fist_right",
    "🤜🏻": "fist_right:t2",
    "🤜🏼": "fist_right:t3",
    "🤜🏽": "fist_right:t4",
    "🤜🏾": "fist_right:t5",
    "🤜🏿": "fist_right:t6",
    "✌": "v",
    "✌🏻": "v:t2",
    "✌🏼": "v:t3",
    "✌🏽": "v:t4",
    "✌🏾": "v:t5",
    "✌🏿": "v:t6",
    "👌": "ok_hand",
    "👌🏻": "ok_hand:t2",
    "👌🏼": "ok_hand:t3",
    "👌🏽": "ok_hand:t4",
    "👌🏾": "ok_hand:t5",
    "👌🏿": "ok_hand:t6",
    "✋": "raised_hand",
    "✋🏻": "raised_hand:t2",
    "✋🏼": "raised_hand:t3",
    "✋🏽": "raised_hand:t4",
    "✋🏾": "raised_hand:t5",
    "✋🏿": "raised_hand:t6",
    "🤚": "raised_back_of_hand",
    "🤚🏻": "raised_back_of_hand:t2",
    "🤚🏼": "raised_back_of_hand:t3",
    "🤚🏽": "raised_back_of_hand:t4",
    "🤚🏾": "raised_back_of_hand:t5",
    "🤚🏿": "raised_back_of_hand:t6",
    "👐": "open_hands",
    "👐🏻": "open_hands:t2",
    "👐🏼": "open_hands:t3",
    "👐🏽": "open_hands:t4",
    "👐🏾": "open_hands:t5",
    "👐🏿": "open_hands:t6",
    "💪": "muscle",
    "💪🏻": "muscle:t2",
    "💪🏼": "muscle:t3",
    "💪🏽": "muscle:t4",
    "💪🏾": "muscle:t5",
    "💪🏿": "muscle:t6",
    "🙏": "pray",
    "🙏🏻": "pray:t2",
    "🙏🏼": "pray:t3",
    "🙏🏽": "pray:t4",
    "🙏🏾": "pray:t5",
    "🙏🏿": "pray:t6",
    "🤝": "handshake",
    "☝": "point_up",
    "☝🏻": "point_up:t2",
    "☝🏼": "point_up:t3",
    "☝🏽": "point_up:t4",
    "☝🏾": "point_up:t5",
    "☝🏿": "point_up:t6",
    "👆": "point_up_2",
    "👆🏻": "point_up_2:t2",
    "👆🏼": "point_up_2:t3",
    "👆🏽": "point_up_2:t4",
    "👆🏾": "point_up_2:t5",
    "👆🏿": "point_up_2:t6",
    "👇": "point_down",
    "👇🏻": "point_down:t2",
    "👇🏼": "point_down:t3",
    "👇🏽": "point_down:t4",
    "👇🏾": "point_down:t5",
    "👇🏿": "point_down:t6",
    "👈": "point_left",
    "👈🏻": "point_left:t2",
    "👈🏼": "point_left:t3",
    "👈🏽": "point_left:t4",
    "👈🏾": "point_left:t5",
    "👈🏿": "point_left:t6",
    "👉": "point_right",
    "👉🏻": "point_right:t2",
    "👉🏼": "point_right:t3",
    "👉🏽": "point_right:t4",
    "👉🏾": "point_right:t5",
    "👉🏿": "point_right:t6",
    "🖕": "fu",
    "🖕🏻": "fu:t2",
    "🖕🏼": "fu:t3",
    "🖕🏽": "fu:t4",
    "🖕🏾": "fu:t5",
    "🖕🏿": "fu:t6",
    "🖐": "raised_hand_with_fingers_splayed",
    "🖐🏻": "raised_hand_with_fingers_splayed:t2",
    "🖐🏼": "raised_hand_with_fingers_splayed:t3",
    "🖐🏽": "raised_hand_with_fingers_splayed:t4",
    "🖐🏾": "raised_hand_with_fingers_splayed:t5",
    "🖐🏿": "raised_hand_with_fingers_splayed:t6",
    "🤘": "metal",
    "🤘🏻": "metal:t2",
    "🤘🏼": "metal:t3",
    "🤘🏽": "metal:t4",
    "🤘🏾": "metal:t5",
    "🤘🏿": "metal:t6",
    "🤞": "crossed_fingers",
    "🤞🏻": "crossed_fingers:t2",
    "🤞🏼": "crossed_fingers:t3",
    "🤞🏽": "crossed_fingers:t4",
    "🤞🏾": "crossed_fingers:t5",
    "🤞🏿": "crossed_fingers:t6",
    "🖖": "vulcan_salute",
    "🖖🏻": "vulcan_salute:t2",
    "🖖🏼": "vulcan_salute:t3",
    "🖖🏽": "vulcan_salute:t4",
    "🖖🏾": "vulcan_salute:t5",
    "🖖🏿": "vulcan_salute:t6",
    "✍": "writing_hand",
    "✍🏻": "writing_hand:t2",
    "✍🏼": "writing_hand:t3",
    "✍🏽": "writing_hand:t4",
    "✍🏾": "writing_hand:t5",
    "✍🏿": "writing_hand:t6",
    "🤳": "selfie",
    "🤳🏻": "selfie:t2",
    "🤳🏼": "selfie:t3",
    "🤳🏽": "selfie:t4",
    "🤳🏾": "selfie:t5",
    "🤳🏿": "selfie:t6",
    "💅": "nail_care",
    "💅🏻": "nail_care:t2",
    "💅🏼": "nail_care:t3",
    "💅🏽": "nail_care:t4",
    "💅🏾": "nail_care:t5",
    "💅🏿": "nail_care:t6",
    "👄": "lips",
    "👅": "tongue",
    "👂": "ear",
    "👂🏻": "ear:t2",
    "👂🏼": "ear:t3",
    "👂🏽": "ear:t4",
    "👂🏾": "ear:t5",
    "👂🏿": "ear:t6",
    "👃": "nose",
    "👃🏻": "nose:t2",
    "👃🏼": "nose:t3",
    "👃🏽": "nose:t4",
    "👃🏾": "nose:t5",
    "👃🏿": "nose:t6",
    "👁": "eye",
    "👀": "eyes",
    "👤": "bust_in_silhouette",
    "👥": "busts_in_silhouette",
    "🗣": "speaking_head",
    "👶": "baby",
    "👶🏻": "baby:t2",
    "👶🏼": "baby:t3",
    "👶🏽": "baby:t4",
    "👶🏾": "baby:t5",
    "👶🏿": "baby:t6",
    "👦": "boy",
    "👦🏻": "boy:t2",
    "👦🏼": "boy:t3",
    "👦🏽": "boy:t4",
    "👦🏾": "boy:t5",
    "👦🏿": "boy:t6",
    "👧": "girl",
    "👧🏻": "girl:t2",
    "👧🏼": "girl:t3",
    "👧🏽": "girl:t4",
    "👧🏾": "girl:t5",
    "👧🏿": "girl:t6",
    "👨": "man",
    "👨🏻": "man:t2",
    "👨🏼": "man:t3",
    "👨🏽": "man:t4",
    "👨🏾": "man:t5",
    "👨🏿": "man:t6",
    "👩": "woman",
    "👩🏻": "woman:t2",
    "👩🏼": "woman:t3",
    "👩🏽": "woman:t4",
    "👩🏾": "woman:t5",
    "👩🏿": "woman:t6",
    "👱‍♀️": "blonde_woman",
    "👱🏻‍♀️": "blonde_woman:t2",
    "👱🏼‍♀️": "blonde_woman:t3",
    "👱🏽‍♀️": "blonde_woman:t4",
    "👱🏾‍♀️": "blonde_woman:t5",
    "👱🏿‍♀️": "blonde_woman:t6",
    "👱": "blonde_man",
    "👱🏻": "blonde_man:t2",
    "👱🏼": "blonde_man:t3",
    "👱🏽": "blonde_man:t4",
    "👱🏾": "blonde_man:t5",
    "👱🏿": "blonde_man:t6",
    "👴": "older_man",
    "👴🏻": "older_man:t2",
    "👴🏼": "older_man:t3",
    "👴🏽": "older_man:t4",
    "👴🏾": "older_man:t5",
    "👴🏿": "older_man:t6",
    "👵": "older_woman",
    "👵🏻": "older_woman:t2",
    "👵🏼": "older_woman:t3",
    "👵🏽": "older_woman:t4",
    "👵🏾": "older_woman:t5",
    "👵🏿": "older_woman:t6",
    "👲": "man_with_gua_pi_mao",
    "👲🏻": "man_with_gua_pi_mao:t2",
    "👲🏼": "man_with_gua_pi_mao:t3",
    "👲🏽": "man_with_gua_pi_mao:t4",
    "👲🏾": "man_with_gua_pi_mao:t5",
    "👲🏿": "man_with_gua_pi_mao:t6",
    "👳‍♀️": "woman_with_turban",
    "👳🏻‍♀️": "woman_with_turban:t2",
    "👳🏼‍♀️": "woman_with_turban:t3",
    "👳🏽‍♀️": "woman_with_turban:t4",
    "👳🏾‍♀️": "woman_with_turban:t5",
    "👳🏿‍♀️": "woman_with_turban:t6",
    "👳": "man_with_turban",
    "👳🏻": "man_with_turban:t2",
    "👳🏼": "man_with_turban:t3",
    "👳🏽": "man_with_turban:t4",
    "👳🏾": "man_with_turban:t5",
    "👳🏿": "man_with_turban:t6",
    "👮‍♀️": "policewoman",
    "👮🏻‍♀️": "policewoman:t2",
    "👮🏼‍♀️": "policewoman:t3",
    "👮🏽‍♀️": "policewoman:t4",
    "👮🏾‍♀️": "policewoman:t5",
    "👮🏿‍♀️": "policewoman:t6",
    "👮": "policeman",
    "👮🏻": "policeman:t2",
    "👮🏼": "policeman:t3",
    "👮🏽": "policeman:t4",
    "👮🏾": "policeman:t5",
    "👮🏿": "policeman:t6",
    "👷‍♀️": "construction_worker_woman",
    "👷🏻‍♀️": "construction_worker_woman:t2",
    "👷🏼‍♀️": "construction_worker_woman:t3",
    "👷🏽‍♀️": "construction_worker_woman:t4",
    "👷🏾‍♀️": "construction_worker_woman:t5",
    "👷🏿‍♀️": "construction_worker_woman:t6",
    "👷": "construction_worker_man",
    "👷🏻": "construction_worker_man:t2",
    "👷🏼": "construction_worker_man:t3",
    "👷🏽": "construction_worker_man:t4",
    "👷🏾": "construction_worker_man:t5",
    "👷🏿": "construction_worker_man:t6",
    "💂‍♀️": "guardswoman",
    "💂🏻‍♀️": "guardswoman:t2",
    "💂🏼‍♀️": "guardswoman:t3",
    "💂🏽‍♀️": "guardswoman:t4",
    "💂🏾‍♀️": "guardswoman:t5",
    "💂🏿‍♀️": "guardswoman:t6",
    "💂": "guardsman",
    "💂🏻": "guardsman:t2",
    "💂🏼": "guardsman:t3",
    "💂🏽": "guardsman:t4",
    "💂🏾": "guardsman:t5",
    "💂🏿": "guardsman:t6",
    "🕵️‍♀": "female_detective",
    "🕵": "male_detective",
    "🕵🏻": "male_detective:t2",
    "🕵🏼": "male_detective:t3",
    "🕵🏽": "male_detective:t4",
    "🕵🏾": "male_detective:t5",
    "🕵🏿": "male_detective:t6",
    "👩‍⚕️": "woman_health_worker",
    "👩🏻‍⚕️": "woman_health_worker:t2",
    "👩🏼‍⚕️": "woman_health_worker:t3",
    "👩🏽‍⚕️": "woman_health_worker:t4",
    "👩🏾‍⚕️": "woman_health_worker:t5",
    "👩🏿‍⚕️": "woman_health_worker:t6",
    "👨‍⚕️": "man_health_worker",
    "👨🏻‍⚕️": "man_health_worker:t2",
    "👨🏼‍⚕️": "man_health_worker:t3",
    "👨🏽‍⚕️": "man_health_worker:t4",
    "👨🏾‍⚕️": "man_health_worker:t5",
    "👨🏿‍⚕️": "man_health_worker:t6",
    "👩‍🌾": "woman_farmer",
    "👩🏻‍🌾": "woman_farmer:t2",
    "👩🏼‍🌾": "woman_farmer:t3",
    "👩🏽‍🌾": "woman_farmer:t4",
    "👩🏾‍🌾": "woman_farmer:t5",
    "👩🏿‍🌾": "woman_farmer:t6",
    "👨‍🌾": "man_farmer",
    "👨🏻‍🌾": "man_farmer:t2",
    "👨🏼‍🌾": "man_farmer:t3",
    "👨🏽‍🌾": "man_farmer:t4",
    "👨🏾‍🌾": "man_farmer:t5",
    "👨🏿‍🌾": "man_farmer:t6",
    "👩‍🍳": "woman_cook",
    "👩🏻‍🍳": "woman_cook:t2",
    "👩🏼‍🍳": "woman_cook:t3",
    "👩🏽‍🍳": "woman_cook:t4",
    "👩🏾‍🍳": "woman_cook:t5",
    "👩🏿‍🍳": "woman_cook:t6",
    "👨‍🍳": "man_cook",
    "👨🏻‍🍳": "man_cook:t2",
    "👨🏼‍🍳": "man_cook:t3",
    "👨🏽‍🍳": "man_cook:t4",
    "👨🏾‍🍳": "man_cook:t5",
    "👨🏿‍🍳": "man_cook:t6",
    "👩‍🎓": "woman_student",
    "👩🏻‍🎓": "woman_student:t2",
    "👩🏼‍🎓": "woman_student:t3",
    "👩🏽‍🎓": "woman_student:t4",
    "👩🏾‍🎓": "woman_student:t5",
    "👩🏿‍🎓": "woman_student:t6",
    "👨‍🎓": "man_student",
    "👨🏻‍🎓": "man_student:t2",
    "👨🏼‍🎓": "man_student:t3",
    "👨🏽‍🎓": "man_student:t4",
    "👨🏾‍🎓": "man_student:t5",
    "👨🏿‍🎓": "man_student:t6",
    "👩‍🎤": "woman_singer",
    "👩🏻‍🎤": "woman_singer:t2",
    "👩🏼‍🎤": "woman_singer:t3",
    "👩🏽‍🎤": "woman_singer:t4",
    "👩🏾‍🎤": "woman_singer:t5",
    "👩🏿‍🎤": "woman_singer:t6",
    "👨‍🎤": "man_singer",
    "👨🏻‍🎤": "man_singer:t2",
    "👨🏼‍🎤": "man_singer:t3",
    "👨🏽‍🎤": "man_singer:t4",
    "👨🏾‍🎤": "man_singer:t5",
    "👨🏿‍🎤": "man_singer:t6",
    "👩‍🏫": "woman_teacher",
    "👩🏻‍🏫": "woman_teacher:t2",
    "👩🏼‍🏫": "woman_teacher:t3",
    "👩🏽‍🏫": "woman_teacher:t4",
    "👩🏾‍🏫": "woman_teacher:t5",
    "👩🏿‍🏫": "woman_teacher:t6",
    "👨‍🏫": "man_teacher",
    "👨🏻‍🏫": "man_teacher:t2",
    "👨🏼‍🏫": "man_teacher:t3",
    "👨🏽‍🏫": "man_teacher:t4",
    "👨🏾‍🏫": "man_teacher:t5",
    "👨🏿‍🏫": "man_teacher:t6",
    "👩‍🏭": "woman_factory_worker",
    "👩🏻‍🏭": "woman_factory_worker:t2",
    "👩🏼‍🏭": "woman_factory_worker:t3",
    "👩🏽‍🏭": "woman_factory_worker:t4",
    "👩🏾‍🏭": "woman_factory_worker:t5",
    "👩🏿‍🏭": "woman_factory_worker:t6",
    "👨‍🏭": "man_factory_worker",
    "👨🏻‍🏭": "man_factory_worker:t2",
    "👨🏼‍🏭": "man_factory_worker:t3",
    "👨🏽‍🏭": "man_factory_worker:t4",
    "👨🏾‍🏭": "man_factory_worker:t5",
    "👨🏿‍🏭": "man_factory_worker:t6",
    "👩‍💻": "woman_technologist",
    "👩🏻‍💻": "woman_technologist:t2",
    "👩🏼‍💻": "woman_technologist:t3",
    "👩🏽‍💻": "woman_technologist:t4",
    "👩🏾‍💻": "woman_technologist:t5",
    "👩🏿‍💻": "woman_technologist:t6",
    "👨‍💻": "man_technologist",
    "👨🏻‍💻": "man_technologist:t2",
    "👨🏼‍💻": "man_technologist:t3",
    "👨🏽‍💻": "man_technologist:t4",
    "👨🏾‍💻": "man_technologist:t5",
    "👨🏿‍💻": "man_technologist:t6",
    "👩‍💼": "woman_office_worker",
    "👩🏻‍💼": "woman_office_worker:t2",
    "👩🏼‍💼": "woman_office_worker:t3",
    "👩🏽‍💼": "woman_office_worker:t4",
    "👩🏾‍💼": "woman_office_worker:t5",
    "👩🏿‍💼": "woman_office_worker:t6",
    "👨‍💼": "man_office_worker",
    "👨🏻‍💼": "man_office_worker:t2",
    "👨🏼‍💼": "man_office_worker:t3",
    "👨🏽‍💼": "man_office_worker:t4",
    "👨🏾‍💼": "man_office_worker:t5",
    "👨🏿‍💼": "man_office_worker:t6",
    "👩‍🔧": "woman_mechanic",
    "👩🏻‍🔧": "woman_mechanic:t2",
    "👩🏼‍🔧": "woman_mechanic:t3",
    "👩🏽‍🔧": "woman_mechanic:t4",
    "👩🏾‍🔧": "woman_mechanic:t5",
    "👩🏿‍🔧": "woman_mechanic:t6",
    "👨‍🔧": "man_mechanic",
    "👨🏻‍🔧": "man_mechanic:t2",
    "👨🏼‍🔧": "man_mechanic:t3",
    "👨🏽‍🔧": "man_mechanic:t4",
    "👨🏾‍🔧": "man_mechanic:t5",
    "👨🏿‍🔧": "man_mechanic:t6",
    "👩‍🔬": "woman_scientist",
    "👩🏻‍🔬": "woman_scientist:t2",
    "👩🏼‍🔬": "woman_scientist:t3",
    "👩🏽‍🔬": "woman_scientist:t4",
    "👩🏾‍🔬": "woman_scientist:t5",
    "👩🏿‍🔬": "woman_scientist:t6",
    "👨‍🔬": "man_scientist",
    "👨🏻‍🔬": "man_scientist:t2",
    "👨🏼‍🔬": "man_scientist:t3",
    "👨🏽‍🔬": "man_scientist:t4",
    "👨🏾‍🔬": "man_scientist:t5",
    "👨🏿‍🔬": "man_scientist:t6",
    "👩‍🎨": "woman_artist",
    "👩🏻‍🎨": "woman_artist:t2",
    "👩🏼‍🎨": "woman_artist:t3",
    "👩🏽‍🎨": "woman_artist:t4",
    "👩🏾‍🎨": "woman_artist:t5",
    "👩🏿‍🎨": "woman_artist:t6",
    "👨‍🎨": "man_artist",
    "👨🏻‍🎨": "man_artist:t2",
    "👨🏼‍🎨": "man_artist:t3",
    "👨🏽‍🎨": "man_artist:t4",
    "👨🏾‍🎨": "man_artist:t5",
    "👨🏿‍🎨": "man_artist:t6",
    "👩‍🚒": "woman_firefighter",
    "👩🏻‍🚒": "woman_firefighter:t2",
    "👩🏼‍🚒": "woman_firefighter:t3",
    "👩🏽‍🚒": "woman_firefighter:t4",
    "👩🏾‍🚒": "woman_firefighter:t5",
    "👩🏿‍🚒": "woman_firefighter:t6",
    "👨‍🚒": "man_firefighter",
    "👨🏻‍🚒": "man_firefighter:t2",
    "👨🏼‍🚒": "man_firefighter:t3",
    "👨🏽‍🚒": "man_firefighter:t4",
    "👨🏾‍🚒": "man_firefighter:t5",
    "👨🏿‍🚒": "man_firefighter:t6",
    "👩‍✈️": "woman_pilot",
    "👩🏻‍✈️": "woman_pilot:t2",
    "👩🏼‍✈️": "woman_pilot:t3",
    "👩🏽‍✈️": "woman_pilot:t4",
    "👩🏾‍✈️": "woman_pilot:t5",
    "👩🏿‍✈️": "woman_pilot:t6",
    "👨‍✈️": "man_pilot",
    "👨🏻‍✈️": "man_pilot:t2",
    "👨🏼‍✈️": "man_pilot:t3",
    "👨🏽‍✈️": "man_pilot:t4",
    "👨🏾‍✈️": "man_pilot:t5",
    "👨🏿‍✈️": "man_pilot:t6",
    "👩‍🚀": "woman_astronaut",
    "👩🏻‍🚀": "woman_astronaut:t2",
    "👩🏼‍🚀": "woman_astronaut:t3",
    "👩🏽‍🚀": "woman_astronaut:t4",
    "👩🏾‍🚀": "woman_astronaut:t5",
    "👩🏿‍🚀": "woman_astronaut:t6",
    "👨‍🚀": "man_astronaut",
    "👨🏻‍🚀": "man_astronaut:t2",
    "👨🏼‍🚀": "man_astronaut:t3",
    "👨🏽‍🚀": "man_astronaut:t4",
    "👨🏾‍🚀": "man_astronaut:t5",
    "👨🏿‍🚀": "man_astronaut:t6",
    "👩‍⚖️": "woman_judge",
    "👩🏻‍⚖️": "woman_judge:t2",
    "👩🏼‍⚖️": "woman_judge:t3",
    "👩🏽‍⚖️": "woman_judge:t4",
    "👩🏾‍⚖️": "woman_judge:t5",
    "👩🏿‍⚖️": "woman_judge:t6",
    "👨‍⚖️": "man_judge",
    "👨🏻‍⚖️": "man_judge:t2",
    "👨🏼‍⚖️": "man_judge:t3",
    "👨🏽‍⚖️": "man_judge:t4",
    "👨🏾‍⚖️": "man_judge:t5",
    "👨🏿‍⚖️": "man_judge:t6",
    "🤶": "mrs_claus",
    "🤶🏻": "mrs_claus:t2",
    "🤶🏼": "mrs_claus:t3",
    "🤶🏽": "mrs_claus:t4",
    "🤶🏾": "mrs_claus:t5",
    "🤶🏿": "mrs_claus:t6",
    "🎅": "santa",
    "🎅🏻": "santa:t2",
    "🎅🏼": "santa:t3",
    "🎅🏽": "santa:t4",
    "🎅🏾": "santa:t5",
    "🎅🏿": "santa:t6",
    "👼": "angel",
    "👼🏻": "angel:t2",
    "👼🏼": "angel:t3",
    "👼🏽": "angel:t4",
    "👼🏾": "angel:t5",
    "👼🏿": "angel:t6",
    "🤰": "pregnant_woman",
    "🤰🏻": "pregnant_woman:t2",
    "🤰🏼": "pregnant_woman:t3",
    "🤰🏽": "pregnant_woman:t4",
    "🤰🏾": "pregnant_woman:t5",
    "🤰🏿": "pregnant_woman:t6",
    "👸": "princess",
    "👸🏻": "princess:t2",
    "👸🏼": "princess:t3",
    "👸🏽": "princess:t4",
    "👸🏾": "princess:t5",
    "👸🏿": "princess:t6",
    "🤴": "prince",
    "🤴🏻": "prince:t2",
    "🤴🏼": "prince:t3",
    "🤴🏽": "prince:t4",
    "🤴🏾": "prince:t5",
    "🤴🏿": "prince:t6",
    "👰": "bride_with_veil",
    "👰🏻": "bride_with_veil:t2",
    "👰🏼": "bride_with_veil:t3",
    "👰🏽": "bride_with_veil:t4",
    "👰🏾": "bride_with_veil:t5",
    "👰🏿": "bride_with_veil:t6",
    "🤵": "man_in_tuxedo",
    "🤵🏻": "man_in_tuxedo:t2",
    "🤵🏼": "man_in_tuxedo:t3",
    "🤵🏽": "man_in_tuxedo:t4",
    "🤵🏾": "man_in_tuxedo:t5",
    "🤵🏿": "man_in_tuxedo:t6",
    "🏃‍♀️": "running_woman",
    "🏃🏻‍♀️": "running_woman:t2",
    "🏃🏼‍♀️": "running_woman:t3",
    "🏃🏽‍♀️": "running_woman:t4",
    "🏃🏾‍♀️": "running_woman:t5",
    "🏃🏿‍♀️": "running_woman:t6",
    "🏃": "running_man",
    "🏃🏻": "running_man:t2",
    "🏃🏼": "running_man:t3",
    "🏃🏽": "running_man:t4",
    "🏃🏾": "running_man:t5",
    "🏃🏿": "running_man:t6",
    "🚶‍♀️": "walking_woman",
    "🚶🏻‍♀️": "walking_woman:t2",
    "🚶🏼‍♀️": "walking_woman:t3",
    "🚶🏽‍♀️": "walking_woman:t4",
    "🚶🏾‍♀️": "walking_woman:t5",
    "🚶🏿‍♀️": "walking_woman:t6",
    "🚶": "walking_man",
    "🚶🏻": "walking_man:t2",
    "🚶🏼": "walking_man:t3",
    "🚶🏽": "walking_man:t4",
    "🚶🏾": "walking_man:t5",
    "🚶🏿": "walking_man:t6",
    "💃": "dancer",
    "💃🏻": "dancer:t2",
    "💃🏼": "dancer:t3",
    "💃🏽": "dancer:t4",
    "💃🏾": "dancer:t5",
    "💃🏿": "dancer:t6",
    "🕺": "man_dancing",
    "🕺🏻": "man_dancing:t2",
    "🕺🏼": "man_dancing:t3",
    "🕺🏽": "man_dancing:t4",
    "🕺🏾": "man_dancing:t5",
    "🕺🏿": "man_dancing:t6",
    "👯": "dancing_women",
    "👯‍♂": "dancing_men",
    "👫": "couple",
    "👬": "two_men_holding_hands",
    "👭": "two_women_holding_hands",
    "🙇‍♀️": "bowing_woman",
    "🙇🏻‍♀️": "bowing_woman:t2",
    "🙇🏼‍♀️": "bowing_woman:t3",
    "🙇🏽‍♀️": "bowing_woman:t4",
    "🙇🏾‍♀️": "bowing_woman:t5",
    "🙇🏿‍♀️": "bowing_woman:t6",
    "🙇": "bowing_man",
    "🙇🏻": "bowing_man:t2",
    "🙇🏼": "bowing_man:t3",
    "🙇🏽": "bowing_man:t4",
    "🙇🏾": "bowing_man:t5",
    "🙇🏿": "bowing_man:t6",
    "🤦‍♂️": "man_facepalming",
    "🤦🏻‍♂️": "man_facepalming:t2",
    "🤦🏼‍♂️": "man_facepalming:t3",
    "🤦🏽‍♂️": "man_facepalming:t4",
    "🤦🏾‍♂️": "man_facepalming:t5",
    "🤦🏿‍♂️": "man_facepalming:t6",
    "🤦‍♀️": "woman_facepalming",
    "🤦🏻‍♀️": "woman_facepalming:t2",
    "🤦🏼‍♀️": "woman_facepalming:t3",
    "🤦🏽‍♀️": "woman_facepalming:t4",
    "🤦🏾‍♀️": "woman_facepalming:t5",
    "🤦🏿‍♀️": "woman_facepalming:t6",
    "🤷‍♀️": "woman_shrugging",
    "🤷🏻‍♀️": "woman_shrugging:t2",
    "🤷🏼‍♀️": "woman_shrugging:t3",
    "🤷🏽‍♀️": "woman_shrugging:t4",
    "🤷🏾‍♀️": "woman_shrugging:t5",
    "🤷🏿‍♀️": "woman_shrugging:t6",
    "🤷‍♂️": "man_shrugging",
    "🤷🏻‍♂️": "man_shrugging:t2",
    "🤷🏼‍♂️": "man_shrugging:t3",
    "🤷🏽‍♂️": "man_shrugging:t4",
    "🤷🏾‍♂️": "man_shrugging:t5",
    "🤷🏿‍♂️": "man_shrugging:t6",
    "💁‍♀️": "tipping_hand_woman",
    "💁🏻‍♀️": "tipping_hand_woman:t2",
    "💁🏼‍♀️": "tipping_hand_woman:t3",
    "💁🏽‍♀️": "tipping_hand_woman:t4",
    "💁🏾‍♀️": "tipping_hand_woman:t5",
    "💁🏿‍♀️": "tipping_hand_woman:t6",
    "💁‍♂️": "tipping_hand_man",
    "💁🏻‍♂️": "tipping_hand_man:t2",
    "💁🏼‍♂️": "tipping_hand_man:t3",
    "💁🏽‍♂️": "tipping_hand_man:t4",
    "💁🏾‍♂️": "tipping_hand_man:t5",
    "💁🏿‍♂️": "tipping_hand_man:t6",
    "🙅‍♀️": "no_good_woman",
    "🙅🏻‍♀️": "no_good_woman:t2",
    "🙅🏼‍♀️": "no_good_woman:t3",
    "🙅🏽‍♀️": "no_good_woman:t4",
    "🙅🏾‍♀️": "no_good_woman:t5",
    "🙅🏿‍♀️": "no_good_woman:t6",
    "🙅‍♂️": "no_good_man",
    "🙅🏻‍♂️": "no_good_man:t2",
    "🙅🏼‍♂️": "no_good_man:t3",
    "🙅🏽‍♂️": "no_good_man:t4",
    "🙅🏾‍♂️": "no_good_man:t5",
    "🙅🏿‍♂️": "no_good_man:t6",
    "🙆‍♀️": "ok_woman",
    "🙆🏻‍♀️": "ok_woman:t2",
    "🙆🏼‍♀️": "ok_woman:t3",
    "🙆🏽‍♀️": "ok_woman:t4",
    "🙆🏾‍♀️": "ok_woman:t5",
    "🙆🏿‍♀️": "ok_woman:t6",
    "🙆‍♂️": "ok_man",
    "🙆🏻‍♂️": "ok_man:t2",
    "🙆🏼‍♂️": "ok_man:t3",
    "🙆🏽‍♂️": "ok_man:t4",
    "🙆🏾‍♂️": "ok_man:t5",
    "🙆🏿‍♂️": "ok_man:t6",
    "🙋‍♀️": "raising_hand_woman",
    "🙋🏻‍♀️": "raising_hand_woman:t2",
    "🙋🏼‍♀️": "raising_hand_woman:t3",
    "🙋🏽‍♀️": "raising_hand_woman:t4",
    "🙋🏾‍♀️": "raising_hand_woman:t5",
    "🙋🏿‍♀️": "raising_hand_woman:t6",
    "🙋‍♂️": "raising_hand_man",
    "🙋🏻‍♂️": "raising_hand_man:t2",
    "🙋🏼‍♂️": "raising_hand_man:t3",
    "🙋🏽‍♂️": "raising_hand_man:t4",
    "🙋🏾‍♂️": "raising_hand_man:t5",
    "🙋🏿‍♂️": "raising_hand_man:t6",
    "🙎‍♀️": "pouting_woman",
    "🙎🏻‍♀️": "pouting_woman:t2",
    "🙎🏼‍♀️": "pouting_woman:t3",
    "🙎🏽‍♀️": "pouting_woman:t4",
    "🙎🏾‍♀️": "pouting_woman:t5",
    "🙎🏿‍♀️": "pouting_woman:t6",
    "🙎‍♂️": "pouting_man",
    "🙎🏻‍♂️": "pouting_man:t2",
    "🙎🏼‍♂️": "pouting_man:t3",
    "🙎🏽‍♂️": "pouting_man:t4",
    "🙎🏾‍♂️": "pouting_man:t5",
    "🙎🏿‍♂️": "pouting_man:t6",
    "🙍‍♀️": "frowning_woman",
    "🙍🏻‍♀️": "frowning_woman:t2",
    "🙍🏼‍♀️": "frowning_woman:t3",
    "🙍🏽‍♀️": "frowning_woman:t4",
    "🙍🏾‍♀️": "frowning_woman:t5",
    "🙍🏿‍♀️": "frowning_woman:t6",
    "🙍‍♂️": "frowning_man",
    "🙍🏻‍♂️": "frowning_man:t2",
    "🙍🏼‍♂️": "frowning_man:t3",
    "🙍🏽‍♂️": "frowning_man:t4",
    "🙍🏾‍♂️": "frowning_man:t5",
    "🙍🏿‍♂️": "frowning_man:t6",
    "💇‍♀️": "haircut_woman",
    "💇🏻‍♀️": "haircut_woman:t2",
    "💇🏼‍♀️": "haircut_woman:t3",
    "💇🏽‍♀️": "haircut_woman:t4",
    "💇🏾‍♀️": "haircut_woman:t5",
    "💇🏿‍♀️": "haircut_woman:t6",
    "💇‍♂️": "haircut_man",
    "💇🏻‍♂️": "haircut_man:t2",
    "💇🏼‍♂️": "haircut_man:t3",
    "💇🏽‍♂️": "haircut_man:t4",
    "💇🏾‍♂️": "haircut_man:t5",
    "💇🏿‍♂️": "haircut_man:t6",
    "💆‍♀️": "massage_woman",
    "💆🏻‍♀️": "massage_woman:t2",
    "💆🏼‍♀️": "massage_woman:t3",
    "💆🏽‍♀️": "massage_woman:t4",
    "💆🏾‍♀️": "massage_woman:t5",
    "💆🏿‍♀️": "massage_woman:t6",
    "💆‍♂️": "massage_man",
    "💆🏻‍♂️": "massage_man:t2",
    "💆🏼‍♂️": "massage_man:t3",
    "💆🏽‍♂️": "massage_man:t4",
    "💆🏾‍♂️": "massage_man:t5",
    "💆🏿‍♂️": "massage_man:t6",
    "💑": "couple_with_heart_woman_man",
    "👩‍❤️‍👩": "couple_with_heart_woman_woman",
    "👨‍❤️‍👨": "couple_with_heart_man_man",
    "💏": "couplekiss_man_woman",
    "👩‍❤️‍💋‍👩": "couplekiss_woman_woman",
    "👨‍❤️‍💋‍👨": "couplekiss_man_man",
    "👪": "family_man_woman_boy",
    "👨‍👩‍👧": "family_man_woman_girl",
    "👨‍👩‍👧‍👦": "family_man_woman_girl_boy",
    "👨‍👩‍👦‍👦": "family_man_woman_boy_boy",
    "👨‍👩‍👧‍👧": "family_man_woman_girl_girl",
    "👩‍👩‍👦": "family_woman_woman_boy",
    "👩‍👩‍👧": "family_woman_woman_girl",
    "👩‍👩‍👧‍👦": "family_woman_woman_girl_boy",
    "👩‍👩‍👦‍👦": "family_woman_woman_boy_boy",
    "👩‍👩‍👧‍👧": "family_woman_woman_girl_girl",
    "👨‍👨‍👦": "family_man_man_boy",
    "👨‍👨‍👧": "family_man_man_girl",
    "👨‍👨‍👧‍👦": "family_man_man_girl_boy",
    "👨‍👨‍👦‍👦": "family_man_man_boy_boy",
    "👨‍👨‍👧‍👧": "family_man_man_girl_girl",
    "👩‍👦": "family_woman_boy",
    "👩‍👧": "family_woman_girl",
    "👩‍👧‍👦": "family_woman_girl_boy",
    "👩‍👦‍👦": "family_woman_boy_boy",
    "👩‍👧‍👧": "family_woman_girl_girl",
    "👨‍👦": "family_man_boy",
    "👨‍👧": "family_man_girl",
    "👨‍👧‍👦": "family_man_girl_boy",
    "👨‍👦‍👦": "family_man_boy_boy",
    "👨‍👧‍👧": "family_man_girl_girl",
    "👚": "womans_clothes",
    "👕": "tshirt",
    "👖": "jeans",
    "👔": "necktie",
    "👗": "dress",
    "👙": "bikini",
    "👘": "kimono",
    "💄": "lipstick",
    "💋": "kiss",
    "👣": "footprints",
    "👠": "high_heel",
    "👡": "sandal",
    "👢": "boot",
    "👞": "mans_shoe",
    "👟": "athletic_shoe",
    "👒": "womans_hat",
    "🎩": "tophat",
    "⛑": "rescue_worker_helmet",
    "🎓": "mortar_board",
    "👑": "crown",
    "🎒": "school_satchel",
    "👝": "pouch",
    "👛": "purse",
    "👜": "handbag",
    "💼": "briefcase",
    "👓": "eyeglasses",
    "🕶": "dark_sunglasses",
    "💍": "ring",
    "🌂": "closed_umbrella",
    "🐶": "dog",
    "🐱": "cat",
    "🐭": "mouse",
    "🐹": "hamster",
    "🐰": "rabbit",
    "🦊": "fox_face",
    "🐻": "bear",
    "🐼": "panda_face",
    "🐨": "koala",
    "🐯": "tiger",
    "🦁": "lion",
    "🐮": "cow",
    "🐷": "pig",
    "🐽": "pig_nose",
    "🐸": "frog",
    "🦑": "squid",
    "🐙": "octopus",
    "🦐": "shrimp",
    "🐵": "monkey_face",
    "🦍": "gorilla",
    "🙈": "see_no_evil",
    "🙉": "hear_no_evil",
    "🙊": "speak_no_evil",
    "🐒": "monkey",
    "🐔": "chicken",
    "🐧": "penguin",
    "🐦": "bird",
    "🐤": "baby_chick",
    "🐣": "hatching_chick",
    "🐥": "hatched_chick",
    "🦆": "duck",
    "🦅": "eagle",
    "🦉": "owl",
    "🦇": "bat",
    "🐺": "wolf",
    "🐗": "boar",
    "🐴": "horse",
    "🦄": "unicorn",
    "🐝": "honeybee",
    "🐛": "bug",
    "🦋": "butterfly",
    "🐌": "snail",
    "🐞": "beetle",
    "🐜": "ant",
    "🕷": "spider",
    "🦂": "scorpion",
    "🦀": "crab",
    "🐍": "snake",
    "🦎": "lizard",
    "🐢": "turtle",
    "🐠": "tropical_fish",
    "🐟": "fish",
    "🐡": "blowfish",
    "🐬": "dolphin",
    "🦈": "shark",
    "🐳": "whale",
    "🐋": "whale2",
    "🐊": "crocodile",
    "🐆": "leopard",
    "🐅": "tiger2",
    "🐃": "water_buffalo",
    "🐂": "ox",
    "🐄": "cow2",
    "🦌": "deer",
    "🐪": "dromedary_camel",
    "🐫": "camel",
    "🐘": "elephant",
    "🦏": "rhinoceros",
    "🐐": "goat",
    "🐏": "ram",
    "🐑": "sheep",
    "🐎": "racehorse",
    "🐖": "pig2",
    "🐀": "rat",
    "🐁": "mouse2",
    "🐓": "rooster",
    "🦃": "turkey",
    "🕊": "dove",
    "🐕": "dog2",
    "🐩": "poodle",
    "🐈": "cat2",
    "🐇": "rabbit2",
    "🐿": "chipmunk",
    "🐾": "paw_prints",
    "🐉": "dragon",
    "🐲": "dragon_face",
    "🌵": "cactus",
    "🎄": "christmas_tree",
    "🌲": "evergreen_tree",
    "🌳": "deciduous_tree",
    "🌴": "palm_tree",
    "🌱": "seedling",
    "🌿": "herb",
    "☘": "shamrock",
    "🍀": "four_leaf_clover",
    "🎍": "bamboo",
    "🎋": "tanabata_tree",
    "🍃": "leaves",
    "🍂": "fallen_leaf",
    "🍁": "maple_leaf",
    "🌾": "ear_of_rice",
    "🌺": "hibiscus",
    "🌻": "sunflower",
    "🌹": "rose",
    "🥀": "wilted_flower",
    "🌷": "tulip",
    "🌼": "blossom",
    "🌸": "cherry_blossom",
    "💐": "bouquet",
    "🍄": "mushroom",
    "🌰": "chestnut",
    "🎃": "jack_o_lantern",
    "🐚": "shell",
    "🕸": "spider_web",
    "🌎": "earth_americas",
    "🌍": "earth_africa",
    "🌏": "earth_asia",
    "🌕": "full_moon",
    "🌖": "waning_gibbous_moon",
    "🌗": "last_quarter_moon",
    "🌘": "waning_crescent_moon",
    "🌑": "new_moon",
    "🌒": "waxing_crescent_moon",
    "🌓": "first_quarter_moon",
    "🌔": "waxing_gibbous_moon",
    "🌚": "new_moon_with_face",
    "🌝": "full_moon_with_face",
    "🌛": "first_quarter_moon_with_face",
    "🌜": "last_quarter_moon_with_face",
    "🌞": "sun_with_face",
    "🌙": "crescent_moon",
    "⭐": "star",
    "🌟": "star2",
    "💫": "dizzy",
    "✨": "sparkles",
    "☄": "comet",
    "☀": "sunny",
    "🌤": "sun_behind_small_cloud",
    "⛅": "partly_sunny",
    "🌥": "sun_behind_large_cloud",
    "🌦": "sun_behind_rain_cloud",
    "☁": "cloud",
    "🌧": "cloud_with_rain",
    "⛈": "cloud_with_lightning_and_rain",
    "🌩": "cloud_with_lightning",
    "⚡": "zap",
    "🔥": "fire",
    "💥": "boom",
    "❄": "snowflake",
    "🌨": "cloud_with_snow",
    "⛄": "snowman",
    "☃": "snowman_with_snow",
    "🌬": "wind_face",
    "💨": "dash",
    "🌪": "tornado",
    "🌫": "fog",
    "☂": "open_umbrella",
    "☔": "umbrella",
    "💧": "droplet",
    "💦": "sweat_drops",
    "🌊": "ocean",
    "🍏": "green_apple",
    "🍎": "apple",
    "🍐": "pear",
    "🍊": "tangerine",
    "🍋": "lemon",
    "🍌": "banana",
    "🍉": "watermelon",
    "🍇": "grapes",
    "🍓": "strawberry",
    "🍈": "melon",
    "🍒": "cherries",
    "🍑": "peach",
    "🍍": "pineapple",
    "🥝": "kiwi_fruit",
    "🥑": "avocado",
    "🍅": "tomato",
    "🍆": "eggplant",
    "🥒": "cucumber",
    "🥕": "carrot",
    "🌶": "hot_pepper",
    "🥔": "potato",
    "🌽": "corn",
    "🍠": "sweet_potato",
    "🥜": "peanuts",
    "🍯": "honey_pot",
    "🥐": "croissant",
    "🍞": "bread",
    "🥖": "baguette_bread",
    "🧀": "cheese",
    "🥚": "egg",
    "🥓": "bacon",
    "🥞": "pancakes",
    "🍗": "poultry_leg",
    "🍖": "meat_on_bone",
    "🍤": "fried_shrimp",
    "🍳": "fried_egg",
    "🍔": "hamburger",
    "🍟": "fries",
    "🥙": "stuffed_flatbread",
    "🌭": "hotdog",
    "🍕": "pizza",
    "🍝": "spaghetti",
    "🌮": "taco",
    "🌯": "burrito",
    "🥗": "green_salad",
    "🥘": "shallow_pan_of_food",
    "🍜": "ramen",
    "🍲": "stew",
    "🍥": "fish_cake",
    "🍣": "sushi",
    "🍱": "bento",
    "🍛": "curry",
    "🍙": "rice_ball",
    "🍚": "rice",
    "🍘": "rice_cracker",
    "🍢": "oden",
    "🍡": "dango",
    "🍧": "shaved_ice",
    "🍨": "ice_cream",
    "🍦": "icecream",
    "🍰": "cake",
    "🎂": "birthday",
    "🍮": "custard",
    "🍬": "candy",
    "🍭": "lollipop",
    "🍫": "chocolate_bar",
    "🍿": "popcorn",
    "🍩": "doughnut",
    "🍪": "cookie",
    "🥛": "milk_glass",
    "🍺": "beer",
    "🍻": "beers",
    "🥂": "clinking_glasses",
    "🍷": "wine_glass",
    "🥃": "tumbler_glass",
    "🍸": "cocktail",
    "🍹": "tropical_drink",
    "🍾": "champagne",
    "🍶": "sake",
    "🍵": "tea",
    "☕": "coffee",
    "🍼": "baby_bottle",
    "🥄": "spoon",
    "🍴": "fork_and_knife",
    "🍽": "plate_with_cutlery",
    "⚽": "soccer",
    "🏀": "basketball",
    "🏈": "football",
    "⚾": "baseball",
    "🎾": "tennis",
    "🏐": "volleyball",
    "🏉": "rugby_football",
    "🎱": "8ball",
    "⛳": "golf",
    "🏌️‍♀": "golfing_woman",
    "🏌": "golfing_man",
    "🏌🏻": "golfing_man:t2",
    "🏌🏼": "golfing_man:t3",
    "🏌🏽": "golfing_man:t4",
    "🏌🏾": "golfing_man:t5",
    "🏌🏿": "golfing_man:t6",
    "🏓": "ping_pong",
    "🏸": "badminton",
    "🥅": "goal_net",
    "🏒": "ice_hockey",
    "🏑": "field_hockey",
    "🏏": "cricket_bat_and_ball",
    "🎿": "ski",
    "⛷": "skier",
    "🏂": "snowboarder",
    "🏂🏻": "snowboarder:t2",
    "🏂🏼": "snowboarder:t3",
    "🏂🏽": "snowboarder:t4",
    "🏂🏾": "snowboarder:t5",
    "🏂🏿": "snowboarder:t6",
    "🤺": "person_fencing",
    "🤼‍♀": "women_wrestling",
    "🤼‍♂": "men_wrestling",
    "🤸‍♀️": "woman_cartwheeling",
    "🤸🏻‍♀️": "woman_cartwheeling:t2",
    "🤸🏼‍♀️": "woman_cartwheeling:t3",
    "🤸🏽‍♀️": "woman_cartwheeling:t4",
    "🤸🏾‍♀️": "woman_cartwheeling:t5",
    "🤸🏿‍♀️": "woman_cartwheeling:t6",
    "🤸‍♂️": "man_cartwheeling",
    "🤸🏻‍♂️": "man_cartwheeling:t2",
    "🤸🏼‍♂️": "man_cartwheeling:t3",
    "🤸🏽‍♂️": "man_cartwheeling:t4",
    "🤸🏾‍♂️": "man_cartwheeling:t5",
    "🤸🏿‍♂️": "man_cartwheeling:t6",
    "🤾‍♀️": "woman_playing_handball",
    "🤾🏻‍♀️": "woman_playing_handball:t2",
    "🤾🏼‍♀️": "woman_playing_handball:t3",
    "🤾🏽‍♀️": "woman_playing_handball:t4",
    "🤾🏾‍♀️": "woman_playing_handball:t5",
    "🤾🏿‍♀️": "woman_playing_handball:t6",
    "🤾‍♂️": "man_playing_handball",
    "🤾🏻‍♂️": "man_playing_handball:t2",
    "🤾🏼‍♂️": "man_playing_handball:t3",
    "🤾🏽‍♂️": "man_playing_handball:t4",
    "🤾🏾‍♂️": "man_playing_handball:t5",
    "🤾🏿‍♂️": "man_playing_handball:t6",
    "⛸": "ice_skate",
    "🏹": "bow_and_arrow",
    "🎣": "fishing_pole_and_fish",
    "🥊": "boxing_glove",
    "🥋": "martial_arts_uniform",
    "🚣‍♀️": "rowing_woman",
    "🚣🏻‍♀️": "rowing_woman:t2",
    "🚣🏼‍♀️": "rowing_woman:t3",
    "🚣🏽‍♀️": "rowing_woman:t4",
    "🚣🏾‍♀️": "rowing_woman:t5",
    "🚣🏿‍♀️": "rowing_woman:t6",
    "🚣": "rowing_man",
    "🚣🏻": "rowing_man:t2",
    "🚣🏼": "rowing_man:t3",
    "🚣🏽": "rowing_man:t4",
    "🚣🏾": "rowing_man:t5",
    "🚣🏿": "rowing_man:t6",
    "🏊‍♀️": "swimming_woman",
    "🏊🏻‍♀️": "swimming_woman:t2",
    "🏊🏼‍♀️": "swimming_woman:t3",
    "🏊🏽‍♀️": "swimming_woman:t4",
    "🏊🏾‍♀️": "swimming_woman:t5",
    "🏊🏿‍♀️": "swimming_woman:t6",
    "🏊": "swimming_man",
    "🏊🏻": "swimming_man:t2",
    "🏊🏼": "swimming_man:t3",
    "🏊🏽": "swimming_man:t4",
    "🏊🏾": "swimming_man:t5",
    "🏊🏿": "swimming_man:t6",
    "🤽‍♀️": "woman_playing_water_polo",
    "🤽🏻‍♀️": "woman_playing_water_polo:t2",
    "🤽🏼‍♀️": "woman_playing_water_polo:t3",
    "🤽🏽‍♀️": "woman_playing_water_polo:t4",
    "🤽🏾‍♀️": "woman_playing_water_polo:t5",
    "🤽🏿‍♀️": "woman_playing_water_polo:t6",
    "🤽‍♂️": "man_playing_water_polo",
    "🤽🏻‍♂️": "man_playing_water_polo:t2",
    "🤽🏼‍♂️": "man_playing_water_polo:t3",
    "🤽🏽‍♂️": "man_playing_water_polo:t4",
    "🤽🏾‍♂️": "man_playing_water_polo:t5",
    "🤽🏿‍♂️": "man_playing_water_polo:t6",
    "🏄‍♀️": "surfing_woman",
    "🏄🏻‍♀️": "surfing_woman:t2",
    "🏄🏼‍♀️": "surfing_woman:t3",
    "🏄🏽‍♀️": "surfing_woman:t4",
    "🏄🏾‍♀️": "surfing_woman:t5",
    "🏄🏿‍♀️": "surfing_woman:t6",
    "🏄": "surfing_man",
    "🏄🏻": "surfing_man:t2",
    "🏄🏼": "surfing_man:t3",
    "🏄🏽": "surfing_man:t4",
    "🏄🏾": "surfing_man:t5",
    "🏄🏿": "surfing_man:t6",
    "🛀": "bath",
    "🛀🏻": "bath:t2",
    "🛀🏼": "bath:t3",
    "🛀🏽": "bath:t4",
    "🛀🏾": "bath:t5",
    "🛀🏿": "bath:t6",
    "⛹️‍♀": "basketball_woman",
    "⛹": "basketball_man",
    "⛹🏻": "basketball_man:t2",
    "⛹🏼": "basketball_man:t3",
    "⛹🏽": "basketball_man:t4",
    "⛹🏾": "basketball_man:t5",
    "⛹🏿": "basketball_man:t6",
    "🏋️‍♀": "weight_lifting_woman",
    "🏋": "weight_lifting_man",
    "🏋🏻": "weight_lifting_man:t2",
    "🏋🏼": "weight_lifting_man:t3",
    "🏋🏽": "weight_lifting_man:t4",
    "🏋🏾": "weight_lifting_man:t5",
    "🏋🏿": "weight_lifting_man:t6",
    "🚴‍♀️": "biking_woman",
    "🚴🏻‍♀️": "biking_woman:t2",
    "🚴🏼‍♀️": "biking_woman:t3",
    "🚴🏽‍♀️": "biking_woman:t4",
    "🚴🏾‍♀️": "biking_woman:t5",
    "🚴🏿‍♀️": "biking_woman:t6",
    "🚴": "biking_man",
    "🚴🏻": "biking_man:t2",
    "🚴🏼": "biking_man:t3",
    "🚴🏽": "biking_man:t4",
    "🚴🏾": "biking_man:t5",
    "🚴🏿": "biking_man:t6",
    "🚵‍♀️": "mountain_biking_woman",
    "🚵🏻‍♀️": "mountain_biking_woman:t2",
    "🚵🏼‍♀️": "mountain_biking_woman:t3",
    "🚵🏽‍♀️": "mountain_biking_woman:t4",
    "🚵🏾‍♀️": "mountain_biking_woman:t5",
    "🚵🏿‍♀️": "mountain_biking_woman:t6",
    "🚵": "mountain_biking_man",
    "🚵🏻": "mountain_biking_man:t2",
    "🚵🏼": "mountain_biking_man:t3",
    "🚵🏽": "mountain_biking_man:t4",
    "🚵🏾": "mountain_biking_man:t5",
    "🚵🏿": "mountain_biking_man:t6",
    "🏇": "horse_racing",
    "🏇🏻": "horse_racing:t2",
    "🏇🏼": "horse_racing:t3",
    "🏇🏽": "horse_racing:t4",
    "🏇🏾": "horse_racing:t5",
    "🏇🏿": "horse_racing:t6",
    "🕴": "business_suit_levitating",
    "🕴🏻": "business_suit_levitating:t2",
    "🕴🏼": "business_suit_levitating:t3",
    "🕴🏽": "business_suit_levitating:t4",
    "🕴🏾": "business_suit_levitating:t5",
    "🕴🏿": "business_suit_levitating:t6",
    "🏆": "trophy",
    "🎽": "running_shirt_with_sash",
    "🏅": "medal_sports",
    "🎖": "medal_military",
    "🥇": "1st_place_medal",
    "🥈": "2nd_place_medal",
    "🥉": "3rd_place_medal",
    "🎗": "reminder_ribbon",
    "🏵": "rosette",
    "🎫": "ticket",
    "🎟": "tickets",
    "🎭": "performing_arts",
    "🎨": "art",
    "🎪": "circus_tent",
    "🤹‍♀️": "woman_juggling",
    "🤹🏻‍♀️": "woman_juggling:t2",
    "🤹🏼‍♀️": "woman_juggling:t3",
    "🤹🏽‍♀️": "woman_juggling:t4",
    "🤹🏾‍♀️": "woman_juggling:t5",
    "🤹🏿‍♀️": "woman_juggling:t6",
    "🤹‍♂️": "man_juggling",
    "🤹🏻‍♂️": "man_juggling:t2",
    "🤹🏼‍♂️": "man_juggling:t3",
    "🤹🏽‍♂️": "man_juggling:t4",
    "🤹🏾‍♂️": "man_juggling:t5",
    "🤹🏿‍♂️": "man_juggling:t6",
    "🎤": "microphone",
    "🎧": "headphones",
    "🎼": "musical_score",
    "🎹": "musical_keyboard",
    "🥁": "drum",
    "🎷": "saxophone",
    "🎺": "trumpet",
    "🎸": "guitar",
    "🎻": "violin",
    "🎬": "clapper",
    "🎮": "video_game",
    "👾": "space_invader",
    "🎯": "dart",
    "🎲": "game_die",
    "🎰": "slot_machine",
    "🎳": "bowling",
    "🚗": "red_car",
    "🚕": "taxi",
    "🚙": "blue_car",
    "🚌": "bus",
    "🚎": "trolleybus",
    "🏎": "racing_car",
    "🚓": "police_car",
    "🚑": "ambulance",
    "🚒": "fire_engine",
    "🚐": "minibus",
    "🚚": "truck",
    "🚛": "articulated_lorry",
    "🚜": "tractor",
    "🛴": "kick_scooter",
    "🏍": "motorcycle",
    "🚲": "bike",
    "🛵": "motor_scooter",
    "🚨": "rotating_light",
    "🚔": "oncoming_police_car",
    "🚍": "oncoming_bus",
    "🚘": "oncoming_automobile",
    "🚖": "oncoming_taxi",
    "🚡": "aerial_tramway",
    "🚠": "mountain_cableway",
    "🚟": "suspension_railway",
    "🚃": "railway_car",
    "🚋": "train",
    "🚝": "monorail",
    "🚄": "bullettrain_side",
    "🚅": "bullettrain_front",
    "🚈": "light_rail",
    "🚞": "mountain_railway",
    "🚂": "steam_locomotive",
    "🚆": "train2",
    "🚇": "metro",
    "🚊": "tram",
    "🚉": "station",
    "🚁": "helicopter",
    "🛩": "small_airplane",
    "✈": "airplane",
    "🛫": "flight_departure",
    "🛬": "flight_arrival",
    "⛵": "sailboat",
    "🛥": "motor_boat",
    "🚤": "speedboat",
    "⛴": "ferry",
    "🛳": "passenger_ship",
    "🚀": "rocket",
    "🛰": "artificial_satellite",
    "💺": "seat",
    "🛶": "canoe",
    "⚓": "anchor",
    "🚧": "construction",
    "⛽": "fuelpump",
    "🚏": "busstop",
    "🚦": "vertical_traffic_light",
    "🚥": "traffic_light",
    "🏁": "checkered_flag",
    "🚢": "ship",
    "🎡": "ferris_wheel",
    "🎢": "roller_coaster",
    "🎠": "carousel_horse",
    "🏗": "building_construction",
    "🌁": "foggy",
    "🗼": "tokyo_tower",
    "🏭": "factory",
    "⛲": "fountain",
    "🎑": "rice_scene",
    "⛰": "mountain",
    "🏔": "mountain_snow",
    "🗻": "mount_fuji",
    "🌋": "volcano",
    "🗾": "japan",
    "🏕": "camping",
    "⛺": "tent",
    "🏞": "national_park",
    "🛣": "motorway",
    "🛤": "railway_track",
    "🌅": "sunrise",
    "🌄": "sunrise_over_mountains",
    "🏜": "desert",
    "🏖": "beach_umbrella",
    "🏝": "desert_island",
    "🌇": "city_sunrise",
    "🌆": "city_sunset",
    "🏙": "cityscape",
    "🌃": "night_with_stars",
    "🌉": "bridge_at_night",
    "🌌": "milky_way",
    "🌠": "stars",
    "🎇": "sparkler",
    "🎆": "fireworks",
    "🌈": "rainbow",
    "🏘": "houses",
    "🏰": "european_castle",
    "🏯": "japanese_castle",
    "🏟": "stadium",
    "🗽": "statue_of_liberty",
    "🏠": "house",
    "🏡": "house_with_garden",
    "🏚": "derelict_house",
    "🏢": "office",
    "🏬": "department_store",
    "🏣": "post_office",
    "🏤": "european_post_office",
    "🏥": "hospital",
    "🏦": "bank",
    "🏨": "hotel",
    "🏪": "convenience_store",
    "🏫": "school",
    "🏩": "love_hotel",
    "💒": "wedding",
    "🏛": "classical_building",
    "⛪": "church",
    "🕌": "mosque",
    "🕍": "synagogue",
    "🕋": "kaaba",
    "⛩": "shinto_shrine",
    "⌚": "watch",
    "📱": "iphone",
    "📲": "calling",
    "💻": "computer",
    "⌨": "keyboard",
    "🖥": "desktop_computer",
    "🖨": "printer",
    "🖱": "computer_mouse",
    "🖲": "trackball",
    "🕹": "joystick",
    "🗜": "clamp",
    "💽": "minidisc",
    "💾": "floppy_disk",
    "💿": "cd",
    "📀": "dvd",
    "📼": "vhs",
    "📷": "camera",
    "📸": "camera_flash",
    "📹": "video_camera",
    "🎥": "movie_camera",
    "📽": "film_projector",
    "🎞": "film_strip",
    "📞": "telephone_receiver",
    "☎": "phone",
    "📟": "pager",
    "📠": "fax",
    "📺": "tv",
    "📻": "radio",
    "🎙": "studio_microphone",
    "🎚": "level_slider",
    "🎛": "control_knobs",
    "⏱": "stopwatch",
    "⏲": "timer_clock",
    "⏰": "alarm_clock",
    "🕰": "mantelpiece_clock",
    "⏳": "hourglass_flowing_sand",
    "⌛": "hourglass",
    "📡": "satellite",
    "🔋": "battery",
    "🔌": "electric_plug",
    "💡": "bulb",
    "🔦": "flashlight",
    "🕯": "candle",
    "🗑": "wastebasket",
    "🛢": "oil_drum",
    "💸": "money_with_wings",
    "💵": "dollar",
    "💴": "yen",
    "💶": "euro",
    "💷": "pound",
    "💰": "moneybag",
    "💳": "credit_card",
    "💎": "gem",
    "⚖": "balance_scale",
    "🔧": "wrench",
    "🔨": "hammer",
    "⚒": "hammer_and_pick",
    "🛠": "hammer_and_wrench",
    "⛏": "pick",
    "🔩": "nut_and_bolt",
    "⚙": "gear",
    "⛓": "chains",
    "🔫": "gun",
    "💣": "bomb",
    "🔪": "hocho",
    "🗡": "dagger",
    "⚔": "crossed_swords",
    "🛡": "shield",
    "🚬": "smoking",
    "☠": "skull_and_crossbones",
    "⚰": "coffin",
    "⚱": "funeral_urn",
    "🏺": "amphora",
    "🔮": "crystal_ball",
    "📿": "prayer_beads",
    "💈": "barber",
    "⚗": "alembic",
    "🔭": "telescope",
    "🔬": "microscope",
    "🕳": "hole",
    "💊": "pill",
    "💉": "syringe",
    "🌡": "thermometer",
    "🏷": "label",
    "🔖": "bookmark",
    "🚽": "toilet",
    "🚿": "shower",
    "🛁": "bathtub",
    "🔑": "key",
    "🗝": "old_key",
    "🛋": "couch_and_lamp",
    "🛌": "sleeping_bed",
    "🛌🏻": "sleeping_bed:t2",
    "🛌🏼": "sleeping_bed:t3",
    "🛌🏽": "sleeping_bed:t4",
    "🛌🏾": "sleeping_bed:t5",
    "🛌🏿": "sleeping_bed:t6",
    "🛏": "bed",
    "🚪": "door",
    "🛎": "bellhop_bell",
    "🖼": "framed_picture",
    "🗺": "world_map",
    "⛱": "parasol_on_ground",
    "🗿": "moyai",
    "🛍": "shopping",
    "🛒": "shopping_cart",
    "🎈": "balloon",
    "🎏": "flags",
    "🎀": "ribbon",
    "🎁": "gift",
    "🎊": "confetti_ball",
    "🎉": "tada",
    "🎎": "dolls",
    "🎐": "wind_chime",
    "🎌": "crossed_flags",
    "🏮": "izakaya_lantern",
    "✉": "email",
    "📩": "envelope_with_arrow",
    "📨": "incoming_envelope",
    "📧": "e-mail",
    "💌": "love_letter",
    "📮": "postbox",
    "📪": "mailbox_closed",
    "📫": "mailbox",
    "📬": "mailbox_with_mail",
    "📭": "mailbox_with_no_mail",
    "📦": "package",
    "📯": "postal_horn",
    "📥": "inbox_tray",
    "📤": "outbox_tray",
    "📜": "scroll",
    "📃": "page_with_curl",
    "📑": "bookmark_tabs",
    "📊": "bar_chart",
    "📈": "chart_with_upwards_trend",
    "📉": "chart_with_downwards_trend",
    "📄": "page_facing_up",
    "📅": "date",
    "📆": "calendar",
    "🗓": "spiral_calendar",
    "📇": "card_index",
    "🗃": "card_file_box",
    "🗳": "ballot_box",
    "🗄": "file_cabinet",
    "📋": "clipboard",
    "🗒": "spiral_notepad",
    "📁": "file_folder",
    "📂": "open_file_folder",
    "🗂": "card_index_dividers",
    "🗞": "newspaper_roll",
    "📰": "newspaper",
    "📓": "notebook",
    "📕": "closed_book",
    "📗": "green_book",
    "📘": "blue_book",
    "📙": "orange_book",
    "📔": "notebook_with_decorative_cover",
    "📒": "ledger",
    "📚": "books",
    "📖": "open_book",
    "🔗": "link",
    "📎": "paperclip",
    "🖇": "paperclips",
    "✂": "scissors",
    "📐": "triangular_ruler",
    "📏": "straight_ruler",
    "📌": "pushpin",
    "📍": "round_pushpin",
    "🚩": "triangular_flag_on_post",
    "🏳": "white_flag",
    "🏴": "black_flag",
    "🏳️‍🌈": "rainbow_flag",
    "🔐": "closed_lock_with_key",
    "🔒": "lock",
    "🔓": "unlock",
    "🔏": "lock_with_ink_pen",
    "🖊": "pen",
    "🖋": "fountain_pen",
    "✒": "black_nib",
    "📝": "memo",
    "✏": "pencil2",
    "🖍": "crayon",
    "🖌": "paintbrush",
    "🔍": "mag",
    "🔎": "mag_right",
    "❤": "heart",
    "💛": "yellow_heart",
    "💚": "green_heart",
    "💙": "blue_heart",
    "💜": "purple_heart",
    "🖤": "black_heart",
    "💔": "broken_heart",
    "❣": "heavy_heart_exclamation",
    "💕": "two_hearts",
    "💞": "revolving_hearts",
    "💓": "heartbeat",
    "💗": "heartpulse",
    "💖": "sparkling_heart",
    "💘": "cupid",
    "💝": "gift_heart",
    "💟": "heart_decoration",
    "☮": "peace_symbol",
    "✝": "latin_cross",
    "☪": "star_and_crescent",
    "🕉": "om",
    "☸": "wheel_of_dharma",
    "✡": "star_of_david",
    "🔯": "six_pointed_star",
    "🕎": "menorah",
    "☯": "yin_yang",
    "☦": "orthodox_cross",
    "🛐": "place_of_worship",
    "⛎": "ophiuchus",
    "♈": "aries",
    "♉": "taurus",
    "♊": "gemini",
    "♋": "cancer",
    "♌": "leo",
    "♍": "virgo",
    "♎": "libra",
    "♏": "scorpius",
    "♐": "sagittarius",
    "♑": "capricorn",
    "♒": "aquarius",
    "♓": "pisces",
    "🆔": "id",
    "⚛": "atom_symbol",
    "🈳": "u7a7a",
    "🈹": "u5272",
    "☢": "radioactive",
    "☣": "biohazard",
    "📴": "mobile_phone_off",
    "📳": "vibration_mode",
    "🈶": "u6709",
    "🈚": "u7121",
    "🈸": "u7533",
    "🈺": "u55b6",
    "🈷": "u6708",
    "✴": "eight_pointed_black_star",
    "🆚": "vs",
    "🉑": "accept",
    "💮": "white_flower",
    "🉐": "ideograph_advantage",
    "㊙": "secret",
    "㊗": "congratulations",
    "🈴": "u5408",
    "🈵": "u6e80",
    "🈲": "u7981",
    "🅰": "a",
    "🅱": "b",
    "🆎": "ab",
    "🆑": "cl",
    "🅾": "o2",
    "🆘": "sos",
    "⛔": "no_entry",
    "📛": "name_badge",
    "🚫": "no_entry_sign",
    "❌": "x",
    "⭕": "o",
    "🛑": "stop_sign",
    "💢": "anger",
    "♨": "hotsprings",
    "🚷": "no_pedestrians",
    "🚯": "do_not_litter",
    "🚳": "no_bicycles",
    "🚱": "non-potable_water",
    "🔞": "underage",
    "📵": "no_mobile_phones",
    "❗": "exclamation",
    "❕": "grey_exclamation",
    "❓": "question",
    "❔": "grey_question",
    "‼": "bangbang",
    "⁉": "interrobang",
    "💯": "100",
    "🔅": "low_brightness",
    "🔆": "high_brightness",
    "🔱": "trident",
    "⚜": "fleur_de_lis",
    "〽": "part_alternation_mark",
    "⚠": "warning",
    "🚸": "children_crossing",
    "🔰": "beginner",
    "♻": "recycle",
    "🈯": "u6307",
    "💹": "chart",
    "❇": "sparkle",
    "✳": "eight_spoked_asterisk",
    "❎": "negative_squared_cross_mark",
    "✅": "white_check_mark",
    "💠": "diamond_shape_with_a_dot_inside",
    "🌀": "cyclone",
    "➿": "loop",
    "🌐": "globe_with_meridians",
    "Ⓜ": "m",
    "🏧": "atm",
    "🈂": "sa",
    "🛂": "passport_control",
    "🛃": "customs",
    "🛄": "baggage_claim",
    "🛅": "left_luggage",
    "♿": "wheelchair",
    "🚭": "no_smoking",
    "🚾": "wc",
    "🅿": "parking",
    "🚰": "potable_water",
    "🚹": "mens",
    "🚺": "womens",
    "🚼": "baby_symbol",
    "🚻": "restroom",
    "🚮": "put_litter_in_its_place",
    "🎦": "cinema",
    "📶": "signal_strength",
    "🈁": "koko",
    "🆖": "ng",
    "🆗": "ok",
    "🆙": "up",
    "🆒": "cool",
    "🆕": "new",
    "🆓": "free",
    "0️⃣": "zero",
    "1️⃣": "one",
    "2️⃣": "two",
    "3️⃣": "three",
    "4️⃣": "four",
    "5️⃣": "five",
    "6️⃣": "six",
    "7️⃣": "seven",
    "8️⃣": "eight",
    "9️⃣": "nine",
    "🔟": "keycap_ten",
    "*️⃣": "asterisk",
    "🔢": "1234",
    "▶": "arrow_forward",
    "⏸": "pause_button",
    "⏭": "next_track_button",
    "⏹": "stop_button",
    "⏺": "record_button",
    "⏯": "play_or_pause_button",
    "⏮": "previous_track_button",
    "⏩": "fast_forward",
    "⏪": "rewind",
    "🔀": "twisted_rightwards_arrows",
    "🔁": "repeat",
    "🔂": "repeat_one",
    "◀": "arrow_backward",
    "🔼": "arrow_up_small",
    "🔽": "arrow_down_small",
    "⏫": "arrow_double_up",
    "⏬": "arrow_double_down",
    "➡": "arrow_right",
    "⬅": "arrow_left",
    "⬆": "arrow_up",
    "⬇": "arrow_down",
    "↗": "arrow_upper_right",
    "↘": "arrow_lower_right",
    "↙": "arrow_lower_left",
    "↖": "arrow_upper_left",
    "↕": "arrow_up_down",
    "🔄": "arrows_counterclockwise",
    "↪": "arrow_right_hook",
    "↩": "leftwards_arrow_with_hook",
    "⤴": "arrow_heading_up",
    "⤵": "arrow_heading_down",
    "#️⃣": "hash",
    ℹ: "information_source",
    "🔤": "abc",
    "🔡": "abcd",
    "🔠": "capital_abcd",
    "🔣": "symbols",
    "🎵": "musical_note",
    "🎶": "notes",
    "〰": "wavy_dash",
    "➰": "curly_loop",
    "✔": "heavy_check_mark",
    "🔃": "arrows_clockwise",
    "➕": "heavy_plus_sign",
    "➖": "heavy_minus_sign",
    "➗": "heavy_division_sign",
    "✖": "heavy_multiplication_x",
    "💲": "heavy_dollar_sign",
    "💱": "currency_exchange",
    "🔚": "end",
    "🔙": "back",
    "🔛": "on",
    "🔝": "top",
    "🔜": "soon",
    "☑": "ballot_box_with_check",
    "🔘": "radio_button",
    "⚪": "white_circle",
    "⚫": "black_circle",
    "🔴": "red_circle",
    "🔵": "large_blue_circle",
    "🔸": "small_orange_diamond",
    "🔹": "small_blue_diamond",
    "🔶": "large_orange_diamond",
    "🔷": "large_blue_diamond",
    "🔺": "small_red_triangle",
    "▪": "black_small_square",
    "▫": "white_small_square",
    "⬛": "black_large_square",
    "⬜": "white_large_square",
    "🔻": "small_red_triangle_down",
    "◼": "black_medium_square",
    "◻": "white_medium_square",
    "◾": "black_medium_small_square",
    "◽": "white_medium_small_square",
    "🔲": "black_square_button",
    "🔳": "white_square_button",
    "🔈": "speaker",
    "🔉": "sound",
    "🔊": "loud_sound",
    "🔇": "mute",
    "📣": "mega",
    "📢": "loudspeaker",
    "🔔": "bell",
    "🔕": "no_bell",
    "🃏": "black_joker",
    "🀄": "mahjong",
    "♠": "spades",
    "♣": "clubs",
    "♥": "heart",
    "♦": "diamonds",
    "🎴": "flower_playing_cards",
    "💭": "thought_balloon",
    "🗯": "right_anger_bubble",
    "💬": "speech_balloon",
    "🗨": "left_speech_bubble",
    "🕐": "clock1",
    "🕑": "clock2",
    "🕒": "clock3",
    "🕓": "clock4",
    "🕔": "clock5",
    "🕕": "clock6",
    "🕖": "clock7",
    "🕗": "clock8",
    "🕘": "clock9",
    "🕙": "clock10",
    "🕚": "clock11",
    "🕛": "clock12",
    "🕜": "clock130",
    "🕝": "clock230",
    "🕞": "clock330",
    "🕟": "clock430",
    "🕠": "clock530",
    "🕡": "clock630",
    "🕢": "clock730",
    "🕣": "clock830",
    "🕤": "clock930",
    "🕥": "clock1030",
    "🕦": "clock1130",
    "🕧": "clock1230",
    "🇦🇫": "afghanistan",
    "🇦🇽": "aland_islands",
    "🇦🇱": "albania",
    "🇩🇿": "algeria",
    "🇦🇸": "american_samoa",
    "🇦🇩": "andorra",
    "🇦🇴": "angola",
    "🇦🇮": "anguilla",
    "🇦🇶": "antarctica",
    "🇦🇬": "antigua_barbuda",
    "🇦🇷": "argentina",
    "🇦🇲": "armenia",
    "🇦🇼": "aruba",
    "🇦🇺": "australia",
    "🇦🇹": "austria",
    "🇦🇿": "azerbaijan",
    "🇧🇸": "bahamas",
    "🇧🇭": "bahrain",
    "🇧🇩": "bangladesh",
    "🇧🇧": "barbados",
    "🇧🇾": "belarus",
    "🇧🇪": "belgium",
    "🇧🇿": "belize",
    "🇧🇯": "benin",
    "🇧🇲": "bermuda",
    "🇧🇹": "bhutan",
    "🇧🇴": "bolivia",
    "🇧🇶": "caribbean_netherlands",
    "🇧🇦": "bosnia_herzegovina",
    "🇧🇼": "botswana",
    "🇧🇷": "brazil",
    "🇮🇴": "british_indian_ocean_territory",
    "🇻🇬": "british_virgin_islands",
    "🇧🇳": "brunei",
    "🇧🇬": "bulgaria",
    "🇧🇫": "burkina_faso",
    "🇧🇮": "burundi",
    "🇨🇻": "cape_verde",
    "🇰🇭": "cambodia",
    "🇨🇲": "cameroon",
    "🇨🇦": "canada",
    "🇮🇨": "canary_islands",
    "🇰🇾": "cayman_islands",
    "🇨🇫": "central_african_republic",
    "🇹🇩": "chad",
    "🇨🇱": "chile",
    "🇨🇳": "cn",
    "🇨🇽": "christmas_island",
    "🇨🇨": "cocos_islands",
    "🇨🇴": "colombia",
    "🇰🇲": "comoros",
    "🇨🇬": "congo_brazzaville",
    "🇨🇩": "congo_kinshasa",
    "🇨🇰": "cook_islands",
    "🇨🇷": "costa_rica",
    "🇭🇷": "croatia",
    "🇨🇺": "cuba",
    "🇨🇼": "curacao",
    "🇨🇾": "cyprus",
    "🇨🇿": "czech_republic",
    "🇩🇰": "denmark",
    "🇩🇯": "djibouti",
    "🇩🇲": "dominica",
    "🇩🇴": "dominican_republic",
    "🇪🇨": "ecuador",
    "🇪🇬": "egypt",
    "🇸🇻": "el_salvador",
    "🇬🇶": "equatorial_guinea",
    "🇪🇷": "eritrea",
    "🇪🇪": "estonia",
    "🇪🇹": "ethiopia",
    "🇪🇺": "eu",
    "🇫🇰": "falkland_islands",
    "🇫🇴": "faroe_islands",
    "🇫🇯": "fiji",
    "🇫🇮": "finland",
    "🇫🇷": "fr",
    "🇬🇫": "french_guiana",
    "🇵🇫": "french_polynesia",
    "🇹🇫": "french_southern_territories",
    "🇬🇦": "gabon",
    "🇬🇲": "gambia",
    "🇬🇪": "georgia",
    "🇩🇪": "de",
    "🇬🇭": "ghana",
    "🇬🇮": "gibraltar",
    "🇬🇷": "greece",
    "🇬🇱": "greenland",
    "🇬🇩": "grenada",
    "🇬🇵": "guadeloupe",
    "🇬🇺": "guam",
    "🇬🇹": "guatemala",
    "🇬🇬": "guernsey",
    "🇬🇳": "guinea",
    "🇬🇼": "guinea_bissau",
    "🇬🇾": "guyana",
    "🇭🇹": "haiti",
    "🇭🇳": "honduras",
    "🇭🇰": "hong_kong",
    "🇭🇺": "hungary",
    "🇮🇸": "iceland",
    "🇮🇳": "india",
    "🇮🇩": "indonesia",
    "🇮🇷": "iran",
    "🇮🇶": "iraq",
    "🇮🇪": "ireland",
    "🇮🇲": "isle_of_man",
    "🇮🇱": "israel",
    "🇮🇹": "it",
    "🇨🇮": "cote_divoire",
    "🇯🇲": "jamaica",
    "🇯🇵": "jp",
    "🇯🇪": "jersey",
    "🇯🇴": "jordan",
    "🇰🇿": "kazakhstan",
    "🇰🇪": "kenya",
    "🇰🇮": "kiribati",
    "🇽🇰": "kosovo",
    "🇰🇼": "kuwait",
    "🇰🇬": "kyrgyzstan",
    "🇱🇦": "laos",
    "🇱🇻": "latvia",
    "🇱🇧": "lebanon",
    "🇱🇸": "lesotho",
    "🇱🇷": "liberia",
    "🇱🇾": "libya",
    "🇱🇮": "liechtenstein",
    "🇱🇹": "lithuania",
    "🇱🇺": "luxembourg",
    "🇲🇴": "macau",
    "🇲🇰": "macedonia",
    "🇲🇬": "madagascar",
    "🇲🇼": "malawi",
    "🇲🇾": "malaysia",
    "🇲🇻": "maldives",
    "🇲🇱": "mali",
    "🇲🇹": "malta",
    "🇲🇭": "marshall_islands",
    "🇲🇶": "martinique",
    "🇲🇷": "mauritania",
    "🇲🇺": "mauritius",
    "🇾🇹": "mayotte",
    "🇲🇽": "mexico",
    "🇫🇲": "micronesia",
    "🇲🇩": "moldova",
    "🇲🇨": "monaco",
    "🇲🇳": "mongolia",
    "🇲🇪": "montenegro",
    "🇲🇸": "montserrat",
    "🇲🇦": "morocco",
    "🇲🇿": "mozambique",
    "🇲🇲": "myanmar",
    "🇳🇦": "namibia",
    "🇳🇷": "nauru",
    "🇳🇵": "nepal",
    "🇳🇱": "netherlands",
    "🇳🇨": "new_caledonia",
    "🇳🇿": "new_zealand",
    "🇳🇮": "nicaragua",
    "🇳🇪": "niger",
    "🇳🇬": "nigeria",
    "🇳🇺": "niue",
    "🇳🇫": "norfolk_island",
    "🇲🇵": "northern_mariana_islands",
    "🇰🇵": "north_korea",
    "🇳🇴": "norway",
    "🇴🇲": "oman",
    "🇵🇰": "pakistan",
    "🇵🇼": "palau",
    "🇵🇸": "palestinian_territories",
    "🇵🇦": "panama",
    "🇵🇬": "papua_new_guinea",
    "🇵🇾": "paraguay",
    "🇵🇪": "peru",
    "🇵🇭": "philippines",
    "🇵🇳": "pitcairn_islands",
    "🇵🇱": "poland",
    "🇵🇹": "portugal",
    "🇵🇷": "puerto_rico",
    "🇶🇦": "qatar",
    "🇷🇪": "reunion",
    "🇷🇴": "romania",
    "🇷🇺": "ru",
    "🇷🇼": "rwanda",
    "🇧🇱": "st_barthelemy",
    "🇸🇭": "st_helena",
    "🇰🇳": "st_kitts_nevis",
    "🇱🇨": "st_lucia",
    "🇵🇲": "st_pierre_miquelon",
    "🇻🇨": "st_vincent_grenadines",
    "🇼🇸": "samoa",
    "🇸🇲": "san_marino",
    "🇸🇹": "sao_tome_principe",
    "🇸🇦": "saudi_arabia",
    "🇸🇳": "senegal",
    "🇷🇸": "serbia",
    "🇸🇨": "seychelles",
    "🇸🇱": "sierra_leone",
    "🇸🇬": "singapore",
    "🇸🇽": "sint_maarten",
    "🇸🇰": "slovakia",
    "🇸🇮": "slovenia",
    "🇸🇧": "solomon_islands",
    "🇸🇴": "somalia",
    "🇿🇦": "south_africa",
    "🇬🇸": "south_georgia_south_sandwich_islands",
    "🇰🇷": "kr",
    "🇸🇸": "south_sudan",
    "🇪🇸": "es",
    "🇱🇰": "sri_lanka",
    "🇸🇩": "sudan",
    "🇸🇷": "suriname",
    "🇸🇿": "swaziland",
    "🇸🇪": "sweden",
    "🇨🇭": "switzerland",
    "🇸🇾": "syria",
    "🇹🇼": "taiwan",
    "🇹🇯": "tajikistan",
    "🇹🇿": "tanzania",
    "🇹🇭": "thailand",
    "🇹🇱": "timor_leste",
    "🇹🇬": "togo",
    "🇹🇰": "tokelau",
    "🇹🇴": "tonga",
    "🇹🇹": "trinidad_tobago",
    "🇹🇳": "tunisia",
    "🇹🇷": "tr",
    "🇹🇲": "turkmenistan",
    "🇹🇨": "turks_caicos_islands",
    "🇹🇻": "tuvalu",
    "🇺🇬": "uganda",
    "🇺🇦": "ukraine",
    "🇦🇪": "united_arab_emirates",
    "🇬🇧": "uk",
    "🇺🇸": "us",
    "🇻🇮": "us_virgin_islands",
    "🇺🇾": "uruguay",
    "🇺🇿": "uzbekistan",
    "🇻🇺": "vanuatu",
    "🇻🇦": "vatican_city",
    "🇻🇪": "venezuela",
    "🇻🇳": "vietnam",
    "🇼🇫": "wallis_futuna",
    "🇪🇭": "western_sahara",
    "🇾🇪": "yemen",
    "🇿🇲": "zambia",
    "🇿🇼": "zimbabwe",
    "🤩": "star_struck",
    "🤨": "face_with_raised_eyebrow",
    "🤯": "exploding_head",
    "🤪": "crazy_face",
    "🤬": "face_with_symbols_over_mouth",
    "🤮": "face_vomiting",
    "🤫": "shushing_face",
    "🤭": "face_with_hand_over_mouth",
    "🧐": "face_with_monocle",
    "🧒": "child",
    "🧒🏻": "child:t2",
    "🧒🏼": "child:t3",
    "🧒🏽": "child:t4",
    "🧒🏾": "child:t5",
    "🧒🏿": "child:t6",
    "🧑": "adult",
    "🧑🏻": "adult:t2",
    "🧑🏼": "adult:t3",
    "🧑🏽": "adult:t4",
    "🧑🏾": "adult:t5",
    "🧑🏿": "adult:t6",
    "🧓": "older_adult",
    "🧓🏻": "older_adult:t2",
    "🧓🏼": "older_adult:t3",
    "🧓🏽": "older_adult:t4",
    "🧓🏾": "older_adult:t5",
    "🧓🏿": "older_adult:t6",
    "🧕": "woman_with_headscarf",
    "🧕🏻": "woman_with_headscarf:t2",
    "🧕🏼": "woman_with_headscarf:t3",
    "🧕🏽": "woman_with_headscarf:t4",
    "🧕🏾": "woman_with_headscarf:t5",
    "🧕🏿": "woman_with_headscarf:t6",
    "🧔": "bearded_person",
    "🧔🏻": "bearded_person:t2",
    "🧔🏼": "bearded_person:t3",
    "🧔🏽": "bearded_person:t4",
    "🧔🏾": "bearded_person:t5",
    "🧔🏿": "bearded_person:t6",
    "🤱": "breast_feeding",
    "🤱🏻": "breast_feeding:t2",
    "🤱🏼": "breast_feeding:t3",
    "🤱🏽": "breast_feeding:t4",
    "🤱🏾": "breast_feeding:t5",
    "🤱🏿": "breast_feeding:t6",
    "🧙": "mage",
    "🧙🏻": "mage:t2",
    "🧙🏼": "mage:t3",
    "🧙🏽": "mage:t4",
    "🧙🏾": "mage:t5",
    "🧙🏿": "mage:t6",
    "🧙‍♀️": "woman_mage",
    "🧙🏻‍♀️": "woman_mage:t2",
    "🧙🏼‍♀️": "woman_mage:t3",
    "🧙🏽‍♀️": "woman_mage:t4",
    "🧙🏾‍♀️": "woman_mage:t5",
    "🧙🏿‍♀️": "woman_mage:t6",
    "🧚": "fairy",
    "🧚🏻": "fairy:t2",
    "🧚🏼": "fairy:t3",
    "🧚🏽": "fairy:t4",
    "🧚🏾": "fairy:t5",
    "🧚🏿": "fairy:t6",
    "🧛": "vampire",
    "🧛🏻": "vampire:t2",
    "🧛🏼": "vampire:t3",
    "🧛🏽": "vampire:t4",
    "🧛🏾": "vampire:t5",
    "🧛🏿": "vampire:t6",
    "🧜": "mermaid",
    "🧜🏻": "mermaid:t2",
    "🧜🏼": "mermaid:t3",
    "🧜🏽": "mermaid:t4",
    "🧜🏾": "mermaid:t5",
    "🧜🏿": "mermaid:t6",
    "🧜‍♂️": "merman",
    "🧜🏻‍♂️": "merman:t2",
    "🧜🏼‍♂️": "merman:t3",
    "🧜🏽‍♂️": "merman:t4",
    "🧜🏾‍♂️": "merman:t5",
    "🧜🏿‍♂️": "merman:t6",
    "🧝": "elf",
    "🧝🏻": "elf:t2",
    "🧝🏼": "elf:t3",
    "🧝🏽": "elf:t4",
    "🧝🏾": "elf:t5",
    "🧝🏿": "elf:t6",
    "🧞": "genie",
    "🧞‍♀": "woman_genie",
    "🧟": "zombie",
    "🧟‍♀": "woman_zombie",
    "🧖": "person_in_steamy_room",
    "🧖🏻": "person_in_steamy_room:t2",
    "🧖🏼": "person_in_steamy_room:t3",
    "🧖🏽": "person_in_steamy_room:t4",
    "🧖🏾": "person_in_steamy_room:t5",
    "🧖🏿": "person_in_steamy_room:t6",
    "🧖‍♀️": "woman_in_steamy_room",
    "🧖🏻‍♀️": "woman_in_steamy_room:t2",
    "🧖🏼‍♀️": "woman_in_steamy_room:t3",
    "🧖🏽‍♀️": "woman_in_steamy_room:t4",
    "🧖🏾‍♀️": "woman_in_steamy_room:t5",
    "🧖🏿‍♀️": "woman_in_steamy_room:t6",
    "🧗": "person_climbing",
    "🧗🏻": "person_climbing:t2",
    "🧗🏼": "person_climbing:t3",
    "🧗🏽": "person_climbing:t4",
    "🧗🏾": "person_climbing:t5",
    "🧗🏿": "person_climbing:t6",
    "🧗‍♀️": "woman_climbing",
    "🧗🏻‍♀️": "woman_climbing:t2",
    "🧗🏼‍♀️": "woman_climbing:t3",
    "🧗🏽‍♀️": "woman_climbing:t4",
    "🧗🏾‍♀️": "woman_climbing:t5",
    "🧗🏿‍♀️": "woman_climbing:t6",
    "🧘": "person_in_lotus_position",
    "🧘🏻": "person_in_lotus_position:t2",
    "🧘🏼": "person_in_lotus_position:t3",
    "🧘🏽": "person_in_lotus_position:t4",
    "🧘🏾": "person_in_lotus_position:t5",
    "🧘🏿": "person_in_lotus_position:t6",
    "🧘‍♀️": "woman_in_lotus_position",
    "🧘🏻‍♀️": "woman_in_lotus_position:t2",
    "🧘🏼‍♀️": "woman_in_lotus_position:t3",
    "🧘🏽‍♀️": "woman_in_lotus_position:t4",
    "🧘🏾‍♀️": "woman_in_lotus_position:t5",
    "🧘🏿‍♀️": "woman_in_lotus_position:t6",
    "🤟": "love_you_gesture",
    "🤟🏻": "love_you_gesture:t2",
    "🤟🏼": "love_you_gesture:t3",
    "🤟🏽": "love_you_gesture:t4",
    "🤟🏾": "love_you_gesture:t5",
    "🤟🏿": "love_you_gesture:t6",
    "🤲": "palms_up_together",
    "🤲🏻": "palms_up_together:t2",
    "🤲🏼": "palms_up_together:t3",
    "🤲🏽": "palms_up_together:t4",
    "🤲🏾": "palms_up_together:t5",
    "🤲🏿": "palms_up_together:t6",
    "🧠": "brain",
    "🧡": "orange_heart",
    "🧣": "scarf",
    "🧤": "gloves",
    "🧥": "coat",
    "🧦": "socks",
    "🧢": "billed_cap",
    "🦓": "zebra",
    "🦒": "giraffe",
    "🦔": "hedgehog",
    "🦕": "sauropod",
    "🦖": "t_rex",
    "🦗": "cricket",
    "🥥": "coconut",
    "🥦": "broccoli",
    "🥨": "pretzel",
    "🥩": "cut_of_meat",
    "🥪": "sandwich",
    "🥣": "bowl_with_spoon",
    "🥫": "canned_food",
    "🥟": "dumpling",
    "🥠": "fortune_cookie",
    "🥡": "takeout_box",
    "🥧": "pie",
    "🥤": "cup_with_straw",
    "🥢": "chopsticks",
    "🛸": "flying_saucer",
    "🛷": "sled",
    "🥌": "curling_stone",
    "🇸🇯": "svalbard_and_jan_mayen",
    "🇲🇫": "st_martin",
    "🇺🇲": "us_outlying_islands",
    "🇹🇦": "tristan_da_cunha",
    "🇭🇲": "heard_and_mc_donald_islands",
    "🇪🇦": "ceuta_and_melilla",
    "🇩🇬": "diego_garcia",
    "🇦🇨": "ascension_island",
    "🇧🇻": "bouvet_island",
    "🇨🇵": "clipperton_island",
    "🇺🇳": "united_nations",
    "🥰": "smiling_face_with_three_hearts",
    "🥵": "hot_face",
    "🥶": "cold_face",
    "🥳": "partying_face",
    "🥴": "woozy_face",
    "🥺": "pleading_face",
    "👨‍🦰": "man_red_haired",
    "👨‍🦱": "man_curly_haired",
    "👨‍🦳": "man_white_haired",
    "👨‍🦲": "man_bald",
    "👩‍🦰": "woman_red_haired",
    "👩‍🦱": "woman_curly_haired",
    "👩‍🦳": "woman_white_haired",
    "👩‍🦲": "woman_bald",
    "🦸": "superhero",
    "🦸‍♂": "man_superhero",
    "🦸‍♀": "woman_superhero",
    "🦹": "supervillain",
    "🦹‍♀": "woman_supervillain",
    "🦹‍♂": "man_supervillain",
    "🦵": "leg",
    "🦶": "foot",
    "🦴": "bone",
    "🦷": "tooth",
    "🥽": "goggles",
    "🥼": "lab_coat",
    "🥾": "hiking_boot",
    "🥿": "flat_shoe",
    "🦝": "raccoon",
    "🦙": "llama",
    "🦛": "hippopotamus",
    "🦘": "kangaroo",
    "🦡": "badger",
    "🦢": "swan",
    "🦚": "peacock",
    "🦜": "parrot",
    "🦞": "lobster",
    "🦟": "mosquito",
    "🦠": "microbe",
    "🥭": "mango",
    "🥬": "leafy_green",
    "🥯": "bagel",
    "🧂": "salt",
    "🥮": "moon_cake",
    "🧁": "cupcake",
    "🧭": "compass",
    "🧱": "brick",
    "🛹": "skateboard",
    "🧳": "luggage",
    "🧨": "firecracker",
    "🧧": "red_gift_envelope",
    "🥎": "softball",
    "🥏": "flying_disc",
    "🥍": "lacrosse",
    "🧿": "nazar_amulet",
    "🧩": "jigsaw",
    "🧸": "teddy_bear",
    "♟": "chess_pawn",
    "🧵": "thread",
    "🧶": "yarn",
    "🧮": "abacus",
    "🧾": "receipt",
    "🧰": "toolbox",
    "🧲": "magnet",
    "🧪": "test_tube",
    "🧫": "petri_dish",
    "🧬": "dna",
    "🧴": "lotion_bottle",
    "🧷": "safety_pin",
    "🧹": "broom",
    "🧺": "basket",
    "🧻": "roll_of_toilet_paper",
    "🧼": "soap",
    "🧽": "sponge",
    "🧯": "fire_extinguisher",
    "♾": "infinity",
    "🏴‍☠": "pirate_flag",
    "🧇": "waffle",
    "🦦": "otter",
    "🦥": "sloth",
    "🧊": "ice_cube",
    "🪐": "ringer_planet",
    "🦩": "flamingo",
    "🥱": "yawning_face",
    "🤏": "pinching_hand",
    "🐕‍🦺": "service_dog",
    "🦧": "orangutan",
    "🛺": "auto_rickshaw",
    "🪂": "parachute",
    "🪀": "yo-yo",
    "🪁": "kite",
    "🟫": "brown_square",
    "🟪": "purple_square",
    "🟦": "blue_square",
    "🟩": "green_square",
    "🟨": "yellow_square",
    "🟧": "orange_square",
    "🟥": "red_square",
    "🟤": "brown_circle",
    "🟣": "purple_circle",
    "🟢": "green_circle",
    "🟡": "yellow_circle",
    "🟠": "orange_circle",
    "🪒": "razor",
    "🪑": "chair",
    "🩺": "stethoscope",
    "🩹": "adhesive_bandage",
    "🩸": "drop_of_blood",
    "🦯": "probing_cane",
    "🪓": "axe",
    "🪔": "diya_lamp",
    "🪕": "banjo",
    "🩰": "ballet_shoes",
    "🩳": "shorts",
    "🩲": "briefs",
    "🩱": "one_piece_swimsuit",
    "🥻": "sari",
    "🦺": "safety_vest",
    "🤿": "diving_mask",
    "🦼": "motorized_wheelchair",
    "🦽": "manual_wheelchair",
    "🛕": "hindu_temple",
    "🧉": "maté",
    "🧃": "beverage_box",
    "🦪": "oyster",
    "🧈": "butter",
    "🧆": "falafel",
    "🧅": "onion",
    "🧄": "garlic",
    "🦨": "skunk",
    "🦮": "guide_dog",
    "🧑‍🤝‍🧑": "people_holding_hands",
    "👩‍🦽": "woman_in_manual_wheelchair",
    "👨‍🦽": "man_in_manual_wheelchair",
    "👩‍🦼": "woman_in_motorized_wheelchair",
    "👨‍🦼": "man_in_motorized_wheelchair",
    "👩‍🦯": "woman_with_probing_cane",
    "👨‍🦯": "man_with_probing_cane",
    "🧎‍♀": "woman_kneeling",
    "🧎‍♂": "man_kneeling",
    "🧍‍♂": "man_standing",
    "🧍‍♀": "woman_standing",
    "🧏‍♀": "deaf_woman",
    "🧏‍♂": "deaf_man",
    "🦻": "hear_with_hearing_aid",
    "🦿": "mechanical_leg",
    "🦾": "mechanical_arm",
    "🤍": "white_heart",
    "🤎": "brown_heart",
    "🏳️‍⚧": "transgender_flag",
    "☹": "frowning",
    "☻": "slight_smile",
    "♡": "heart"
  };
  _exports.replacements = replacements;
});
define("pretty-text/emoji/version", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.IMAGE_VERSION = void 0;
  // DO NOT EDIT THIS FILE!!!
  // Update it by running `rake javascript:update_constants`
  var IMAGE_VERSION = "9";
  _exports.IMAGE_VERSION = IMAGE_VERSION;
});
define("pretty-text/emoji", ["exports", "pretty-text/emoji/data", "pretty-text/emoji/version"], function (_exports, _data, _version) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.registerEmoji = registerEmoji;
  _exports.extendedEmojiList = extendedEmojiList;
  _exports.buildReplacementsList = buildReplacementsList;
  _exports.performEmojiUnescape = performEmojiUnescape;
  _exports.performEmojiEscape = performEmojiEscape;
  _exports.isCustomEmoji = isCustomEmoji;
  _exports.buildEmojiUrl = buildEmojiUrl;
  _exports.emojiExists = emojiExists;
  _exports.emojiSearch = emojiSearch;
  _exports.isSkinTonableEmoji = isSkinTonableEmoji;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var extendedEmoji = {};

  function registerEmoji(code, url, group) {
    code = code.toLowerCase();
    extendedEmoji[code] = {
      url: url,
      group: group
    };
  }

  function extendedEmojiList() {
    return extendedEmoji;
  }

  var emojiHash = {};

  function buildReplacementsList(emojiReplacements) {
    return Object.keys(emojiReplacements).sort().reverse().map(function (emoji) {
      return emoji.split("").map(function (chr) {
        return "\\u" + chr.charCodeAt(0).toString(16).padStart(4, "0");
      }).join("");
    }).join("|");
  }

  var replacementListCache;
  var unicodeRegexpCache = {};

  function replacementList() {
    if (replacementListCache === undefined) {
      replacementListCache = buildReplacementsList(_data.replacements);
    }

    return replacementListCache;
  }

  function unicodeRegexp(inlineEmoji) {
    if (unicodeRegexpCache[inlineEmoji] === undefined) {
      var emojiExpression = inlineEmoji ? "|:[^\\s:]+(?::t\\d)?:?" : "|\\B:[^\\s:]+(?::t\\d)?:?\\B";
      unicodeRegexpCache[inlineEmoji] = new RegExp(replacementList() + emojiExpression, "g");
    }

    return unicodeRegexpCache[inlineEmoji];
  } // add all default emojis


  _data.emojis.forEach(function (code) {
    return emojiHash[code] = true;
  }); // and their aliases


  var aliasHash = {};
  Object.keys(_data.aliases).forEach(function (name) {
    _data.aliases[name].forEach(function (alias) {
      return aliasHash[alias] = name;
    });
  });

  function isReplacableInlineEmoji(string, index, inlineEmoji) {
    if (inlineEmoji) {
      return true;
    } // index depends on regex; when `inlineEmoji` is false, the regex starts
    // with a `\B` character, so there's no need to subtract from the index


    var beforeEmoji = string.slice(0, index);
    return beforeEmoji.length === 0 || /(?:\s|[>.,\/#!$%^&*;:{}=\-_`~()])$/.test(beforeEmoji) || new RegExp("(?:".concat(replacementList(), ")$")).test(beforeEmoji);
  }

  function performEmojiUnescape(string, opts) {
    if (!string) {
      return;
    }

    var inlineEmoji = opts.inlineEmoji;
    var regexp = unicodeRegexp(inlineEmoji);
    var allTranslations = Object.assign({}, _data.translations, opts.customEmojiTranslation || {});
    return string.replace(regexp, function (m, index) {
      var isEmoticon = opts.enableEmojiShortcuts && !!allTranslations[m];
      var isUnicodeEmoticon = !!_data.replacements[m];
      var emojiVal;

      if (isEmoticon) {
        emojiVal = allTranslations[m];
      } else if (isUnicodeEmoticon) {
        emojiVal = _data.replacements[m];
      } else {
        emojiVal = m.slice(1, m.length - 1);
      }

      var hasEndingColon = m.lastIndexOf(":") === m.length - 1;
      var url = buildEmojiUrl(emojiVal, opts);
      var classes = isCustomEmoji(emojiVal, opts) ? "emoji emoji-custom" : "emoji";

      if (opts.class) {
        classes = "".concat(classes, " ").concat(opts.class);
      }

      var isReplacable = (isEmoticon || hasEndingColon || isUnicodeEmoticon) && isReplacableInlineEmoji(string, index, inlineEmoji);
      return url && isReplacable ? "<img width=\"20\" height=\"20\" src='".concat(url, "' ").concat(opts.skipTitle ? "" : "title='".concat(emojiVal, "'"), " ").concat(opts.lazy ? "loading='lazy' " : "", "alt='").concat(emojiVal, "' class='").concat(classes, "'>") : m;
    });
  }

  function performEmojiEscape(string, opts) {
    var inlineEmoji = opts.inlineEmoji;
    var regexp = unicodeRegexp(inlineEmoji);
    var allTranslations = Object.assign({}, _data.translations, opts.customEmojiTranslation || {});
    return string.replace(regexp, function (m, index) {
      if (isReplacableInlineEmoji(string, index, inlineEmoji)) {
        if (!!allTranslations[m]) {
          return opts.emojiShortcuts ? ":".concat(allTranslations[m], ":") : m;
        } else if (!!_data.replacements[m]) {
          return ":".concat(_data.replacements[m], ":");
        }
      }

      return m;
    });
  }

  function isCustomEmoji(code, opts) {
    code = code.toLowerCase();

    if (extendedEmoji.hasOwnProperty(code)) {
      return true;
    }

    if (opts && opts.customEmoji && opts.customEmoji.hasOwnProperty(code)) {
      return true;
    }

    return false;
  }

  function buildEmojiUrl(code, opts) {
    var url;
    code = String(code).toLowerCase();

    if (extendedEmoji.hasOwnProperty(code)) {
      url = extendedEmoji[code].url;
    }

    if (opts && opts.customEmoji && opts.customEmoji[code]) {
      url = opts.customEmoji[code].url || opts.customEmoji[code];
    }

    var noToneMatch = code.match(/([^:]+):?/);

    if (noToneMatch && !url && (emojiHash.hasOwnProperty(noToneMatch[1]) || aliasHash.hasOwnProperty(noToneMatch[1]))) {
      url = opts.getURL("/images/emoji/".concat(opts.emojiSet, "/").concat(code.replace(/:t/, "/"), ".png"));
    }

    if (url) {
      url = url + "?v=" + _version.IMAGE_VERSION;
    }

    return url;
  }

  function emojiExists(code) {
    code = code.toLowerCase();
    return !!(extendedEmoji.hasOwnProperty(code) || emojiHash.hasOwnProperty(code) || aliasHash.hasOwnProperty(code));
  }

  var toSearch;

  function emojiSearch(term, options) {
    var maxResults = options && options["maxResults"] || -1;
    var diversity = options && options.diversity;

    if (maxResults === 0) {
      return [];
    }

    toSearch = toSearch || [].concat(_toConsumableArray(Object.keys(emojiHash)), _toConsumableArray(Object.keys(extendedEmoji)), _toConsumableArray(Object.keys(aliasHash))).sort();
    var results = [];

    function addResult(t) {
      var val = aliasHash[t] || t;

      if (results.indexOf(val) === -1) {
        if (diversity && diversity > 1 && isSkinTonableEmoji(val)) {
          results.push("".concat(val, ":t").concat(diversity));
        } else {
          results.push(val);
        }
      }
    } // if term matches from beginning


    for (var i = 0; i < toSearch.length; i++) {
      var item = toSearch[i];

      if (item.indexOf(term) === 0) {
        addResult(item);
      }
    }

    if (_data.searchAliases[term]) {
      results.push.apply(results, _data.searchAliases[term]);
    }

    for (var _i = 0; _i < toSearch.length; _i++) {
      var _item = toSearch[_i];

      if (_item.indexOf(term) > 0) {
        addResult(_item);
      }
    }

    if (maxResults === -1) {
      return results;
    } else {
      return results.slice(0, maxResults);
    }
  }

  function isSkinTonableEmoji(term) {
    var match = term.split(":").filter(Boolean)[0];

    if (match) {
      return _data.tonableEmojis.indexOf(match) !== -1;
    }

    return false;
  }
});
define("pretty-text/engines/discourse-markdown-it", ["exports", "pretty-text/allow-lister", "discourse-common/lib/deprecated", "pretty-text/guid", "pretty-text/sanitizer"], function (_exports, _allowLister, _deprecated, _guid, _sanitizer) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.extractDataAttribute = extractDataAttribute;
  _exports.setup = setup;
  _exports.cook = cook;
  _exports.ATTACHMENT_CSS_CLASS = void 0;

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var ATTACHMENT_CSS_CLASS = "attachment";
  _exports.ATTACHMENT_CSS_CLASS = ATTACHMENT_CSS_CLASS;

  function deprecate(feature, name) {
    return function () {
      if (window.console && window.console.log) {
        window.console.log(feature + ": " + name + " is deprecated, please use the new markdown it APIs");
      }
    };
  }

  function createHelper(featureName, opts, optionCallbacks, pluginCallbacks, getOptions, allowListed) {
    var helper = {};
    helper.markdownIt = true;

    helper.allowList = function (info) {
      return allowListed.push([featureName, info]);
    };

    helper.whiteList = function (info) {
      (0, _deprecated.default)("`whiteList` has been replaced with `allowList`", {
        since: "2.6.0.beta.4",
        dropFrom: "2.7.0"
      });
      helper.allowList(info);
    };

    helper.registerInline = deprecate(featureName, "registerInline");
    helper.replaceBlock = deprecate(featureName, "replaceBlock");
    helper.addPreProcessor = deprecate(featureName, "addPreProcessor");
    helper.inlineReplace = deprecate(featureName, "inlineReplace");
    helper.postProcessTag = deprecate(featureName, "postProcessTag");
    helper.inlineRegexp = deprecate(featureName, "inlineRegexp");
    helper.inlineBetween = deprecate(featureName, "inlineBetween");
    helper.postProcessText = deprecate(featureName, "postProcessText");
    helper.onParseNode = deprecate(featureName, "onParseNode");
    helper.registerBlock = deprecate(featureName, "registerBlock"); // hack to allow moving of getOptions

    helper.getOptions = function () {
      return getOptions.f();
    };

    helper.registerOptions = function (callback) {
      optionCallbacks.push([featureName, callback]);
    };

    helper.registerPlugin = function (callback) {
      pluginCallbacks.push([featureName, callback]);
    };

    return helper;
  } // TODO we may just use a proper ruler from markdown it... this is a basic proxy


  var Ruler = /*#__PURE__*/function () {
    function Ruler() {
      _classCallCheck(this, Ruler);

      this.rules = [];
    }

    _createClass(Ruler, [{
      key: "getRules",
      value: function getRules() {
        return this.rules;
      }
    }, {
      key: "getRuleForTag",
      value: function getRuleForTag(tag) {
        this.ensureCache();

        if (this.cache.hasOwnProperty(tag)) {
          return this.cache[tag];
        }
      }
    }, {
      key: "ensureCache",
      value: function ensureCache() {
        if (this.cache) {
          return;
        }

        this.cache = {};

        for (var i = this.rules.length - 1; i >= 0; i--) {
          var info = this.rules[i];
          this.cache[info.rule.tag] = info;
        }
      }
    }, {
      key: "push",
      value: function push(name, rule) {
        this.rules.push({
          name: name,
          rule: rule
        });
        this.cache = null;
      }
    }]);

    return Ruler;
  }(); // block bb code ruler for parsing of quotes / code / polls


  function setupBlockBBCode(md) {
    md.block.bbcode = {
      ruler: new Ruler()
    };
  }

  function setupInlineBBCode(md) {
    md.inline.bbcode = {
      ruler: new Ruler()
    };
  }

  function setupTextPostProcessRuler(md) {
    var TextPostProcessRuler = requirejs("pretty-text/engines/discourse-markdown/text-post-process").TextPostProcessRuler;
    md.core.textPostProcess = {
      ruler: new TextPostProcessRuler()
    };
  }

  function renderHoisted(tokens, idx, options) {
    var content = tokens[idx].content;

    if (content && content.length > 0) {
      var id = (0, _guid.default)();
      options.discourse.hoisted[id] = tokens[idx].content;
      return id;
    } else {
      return "";
    }
  }

  function setupUrlDecoding(md) {
    // this fixed a subtle issue where %20 is decoded as space in
    // automatic urls
    md.utils.lib.mdurl.decode.defaultChars = ";/?:@&=+$,# ";
  }

  function setupHoister(md) {
    md.renderer.rules.html_raw = renderHoisted;
  }

  function extractDataAttribute(str) {
    var sep = str.indexOf("=");

    if (sep === -1) {
      return null;
    }

    var key = "data-".concat(str.substr(0, sep)).toLowerCase();

    if (!/^[A-Za-z]+[\w\-\:\.]*$/.test(key)) {
      return null;
    }

    var value = str.substr(sep + 1);
    return [key, value];
  } // videoHTML and audioHTML follow the same HTML syntax
  // as oneboxer.rb when dealing with these formats


  function videoHTML(token) {
    var src = token.attrGet("src");
    var origSrc = token.attrGet("data-orig-src");
    var dataOrigSrcAttr = origSrc !== null ? "data-orig-src=\"".concat(origSrc, "\"") : "";
    return "<div class=\"video-container\">\n    <video width=\"100%\" height=\"100%\" preload=\"metadata\" controls>\n      <source src=\"".concat(src, "\" ").concat(dataOrigSrcAttr, ">\n      <a href=\"").concat(src, "\">").concat(src, "</a>\n    </video>\n  </div>");
  }

  function audioHTML(token) {
    var src = token.attrGet("src");
    var origSrc = token.attrGet("data-orig-src");
    var dataOrigSrcAttr = origSrc !== null ? "data-orig-src=\"".concat(origSrc, "\"") : "";
    return "<audio preload=\"metadata\" controls>\n    <source src=\"".concat(src, "\" ").concat(dataOrigSrcAttr, ">\n    <a href=\"").concat(src, "\">").concat(src, "</a>\n  </audio>");
  }

  var IMG_SIZE_REGEX = /^([1-9]+[0-9]*)x([1-9]+[0-9]*)(\s*,\s*(x?)([1-9][0-9]{0,2}?)([%x]?))?$/;

  function renderImageOrPlayableMedia(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    var alt = slf.renderInlineAsText(token.children, options, env);
    var split = alt.split("|");
    var altSplit = [split[0]]; // markdown-it supports returning HTML instead of continuing to render the current token
    // see https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
    // handles |video and |audio alt transformations for image tags

    if (split[1] === "video") {
      if (options.discourse.previewing) {
        return "<div class=\"onebox-placeholder-container\">\n        <span class=\"placeholder-icon video\"></span>\n      </div>";
      } else {
        return videoHTML(token);
      }
    } else if (split[1] === "audio") {
      return audioHTML(token);
    } // parsing ![myimage|500x300]() or ![myimage|75%]() or ![myimage|500x300, 75%]


    for (var i = 1, match, data; i < split.length; ++i) {
      if ((match = split[i].match(IMG_SIZE_REGEX)) && match[1] && match[2]) {
        var width = match[1];
        var height = match[2]; // calculate using percentage

        if (match[5] && match[6] && match[6] === "%") {
          var percent = parseFloat(match[5]) / 100.0;
          width = parseInt(width * percent, 10);
          height = parseInt(height * percent, 10);
        } // calculate using only given width


        if (match[5] && match[6] && match[6] === "x") {
          var wr = parseFloat(match[5]) / width;
          width = parseInt(match[5], 10);
          height = parseInt(height * wr, 10);
        } // calculate using only given height


        if (match[5] && match[4] && match[4] === "x" && !match[6]) {
          var hr = parseFloat(match[5]) / height;
          height = parseInt(match[5], 10);
          width = parseInt(width * hr, 10);
        }

        if (token.attrIndex("width") === -1) {
          token.attrs.push(["width", width]);
        }

        if (token.attrIndex("height") === -1) {
          token.attrs.push(["height", height]);
        }

        if (options.discourse.previewing && match[6] !== "x" && match[4] !== "x") {
          token.attrs.push(["class", "resizable"]);
        }
      } else if (data = extractDataAttribute(split[i])) {
        token.attrs.push(data);
      } else if (split[i] === "thumbnail") {
        token.attrs.push(["data-thumbnail", "true"]);
      } else {
        altSplit.push(split[i]);
      }
    }

    token.attrs[token.attrIndex("alt")][1] = altSplit.join("|");
    return slf.renderToken(tokens, idx, options);
  } // we have taken over the ![]() syntax in markdown to
  // be able to render a video or audio URL as well as the
  // image using |video and |audio in the text inside []


  function setupImageAndPlayableMediaRenderer(md) {
    md.renderer.rules.image = renderImageOrPlayableMedia;
  }

  function renderAttachment(tokens, idx, options, env, slf) {
    var linkToken = tokens[idx];
    var textToken = tokens[idx + 1];
    var split = textToken.content.split("|");
    var contentSplit = [];

    for (var i = 0, data; i < split.length; ++i) {
      if (split[i] === ATTACHMENT_CSS_CLASS) {
        linkToken.attrs.unshift(["class", split[i]]);
      } else if (data = extractDataAttribute(split[i])) {
        linkToken.attrs.push(data);
      } else {
        contentSplit.push(split[i]);
      }
    }

    if (contentSplit.length > 0) {
      textToken.content = contentSplit.join("|");
    }

    return slf.renderToken(tokens, idx, options);
  }

  function setupAttachments(md) {
    md.renderer.rules.link_open = renderAttachment;
  }

  var Helpers;

  function setup(opts, siteSettings, state) {
    if (opts.setup) {
      return;
    } // we got to require this late cause bundle is not loaded in pretty-text


    Helpers = Helpers || requirejs("pretty-text/engines/discourse-markdown/helpers");
    opts.markdownIt = true;
    var optionCallbacks = [];
    var pluginCallbacks = []; // ideally I would like to change the top level API a bit, but in the mean time this will do

    var getOptions = {
      f: function f() {
        return opts;
      }
    };
    var check = /discourse-markdown\/|markdown-it\//;
    var features = [];
    var allowListed = [];
    Object.keys(require._eak_seen).forEach(function (entry) {
      if (check.test(entry)) {
        var module = requirejs(entry);

        if (module && module.setup) {
          var id = entry.split("/").reverse()[0];
          var priority = module.priority || 0;
          features.unshift({
            id: id,
            setup: module.setup,
            priority: priority
          });
        }
      }
    });
    features.sort(function (a, b) {
      return a.priority - b.priority;
    }).forEach(function (f) {
      f.setup(createHelper(f.id, opts, optionCallbacks, pluginCallbacks, getOptions, allowListed));
    });
    Object.entries(state.allowListed || {}).forEach(function (entry) {
      allowListed.push(entry);
    });
    optionCallbacks.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          callback = _ref2[1];

      callback(opts, siteSettings, state);
    }); // enable all features by default

    features.forEach(function (feature) {
      if (!opts.features.hasOwnProperty(feature.id)) {
        opts.features[feature.id] = true;
      }
    });
    var copy = {};
    Object.keys(opts).forEach(function (entry) {
      copy[entry] = opts[entry];
      delete opts[entry];
    });
    copy.helpers = {
      textReplace: Helpers.textReplace
    };
    opts.discourse = copy;

    getOptions.f = function () {
      return opts.discourse;
    };

    opts.discourse.limitedSiteSettings = {
      secureMedia: siteSettings.secure_media
    };
    opts.engine = window.markdownit({
      discourse: opts.discourse,
      html: true,
      breaks: opts.discourse.features.newline,
      xhtmlOut: false,
      linkify: siteSettings.enable_markdown_linkify,
      typographer: siteSettings.enable_markdown_typographer
    });
    var quotation_marks = siteSettings.markdown_typographer_quotation_marks;

    if (quotation_marks) {
      opts.engine.options.quotes = quotation_marks.split("|");
    }

    opts.engine.linkify.tlds((siteSettings.markdown_linkify_tlds || "").split("|"));
    setupUrlDecoding(opts.engine);
    setupHoister(opts.engine);
    setupImageAndPlayableMediaRenderer(opts.engine);
    setupAttachments(opts.engine);
    setupBlockBBCode(opts.engine);
    setupInlineBBCode(opts.engine);
    setupTextPostProcessRuler(opts.engine);
    pluginCallbacks.forEach(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          feature = _ref4[0],
          callback = _ref4[1];

      if (opts.discourse.features[feature]) {
        opts.engine.use(callback);
      }
    }); // top level markdown it notifier

    opts.markdownIt = true;
    opts.setup = true;

    if (!opts.discourse.sanitizer || !opts.sanitizer) {
      var allowLister = new _allowLister.default(opts.discourse);
      allowListed.forEach(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 2),
            feature = _ref6[0],
            info = _ref6[1];

        allowLister.allowListFeature(feature, info);
      });
      opts.sanitizer = opts.discourse.sanitizer = !!opts.discourse.sanitize ? function (a) {
        return (0, _sanitizer.sanitize)(a, allowLister);
      } : function (a) {
        return a;
      };
    }
  }

  function cook(raw, opts) {
    // we still have to hoist html_raw nodes so they bypass the allowlister
    // this is the case for oneboxes
    var hoisted = {};
    opts.discourse.hoisted = hoisted;
    var rendered = opts.engine.render(raw);
    var cooked = opts.discourse.sanitizer(rendered).trim();
    var keys = Object.keys(hoisted);

    if (keys.length) {
      var found = true;

      var unhoist = function unhoist(key) {
        cooked = cooked.replace(new RegExp(key, "g"), function () {
          found = true;
          return hoisted[key];
        });
      };

      while (found) {
        found = false;
        keys.forEach(unhoist);
      }
    }

    delete opts.discourse.hoisted;
    return cooked;
  }
});
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var FilterCSS=require("cssfilter").FilterCSS;var _=require("./util");function getDefaultWhiteList(){return{a:["target","href","title"],abbr:["title"],address:[],area:["shape","coords","href","alt"],article:[],aside:[],audio:["autoplay","controls","loop","preload","src"],b:[],bdi:["dir"],bdo:["dir"],big:[],blockquote:["cite"],br:[],caption:[],center:[],cite:[],code:[],col:["align","valign","span","width"],colgroup:["align","valign","span","width"],dd:[],del:["datetime"],details:["open"],div:[],dl:[],dt:[],em:[],font:["color","size","face"],footer:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],header:[],hr:[],i:[],img:["src","alt","title","width","height"],ins:["datetime"],li:[],mark:[],nav:[],ol:[],p:[],pre:[],s:[],section:[],small:[],span:[],sub:[],sup:[],strong:[],table:["width","border","align","valign"],tbody:["align","valign"],td:["width","rowspan","colspan","align","valign"],tfoot:["align","valign"],th:["width","rowspan","colspan","align","valign"],thead:["align","valign"],tr:["rowspan","align","valign"],tt:[],u:[],ul:[],video:["autoplay","controls","loop","preload","src","height","width"]}}var defaultCSSFilter=new FilterCSS;function onTag(tag,html,options){}function onIgnoreTag(tag,html,options){}function onTagAttr(tag,name,value){}function onIgnoreTagAttr(tag,name,value){}function escapeHtml(html){return html.replace(REGEXP_LT,"&lt;").replace(REGEXP_GT,"&gt;")}function safeAttrValue(tag,name,value,cssFilter){cssFilter=cssFilter||defaultCSSFilter;value=friendlyAttrValue(value);if(name==="href"||name==="src"){value=_.trim(value);if(value==="#")return"#";if(!(value.substr(0,7)==="http://"||value.substr(0,8)==="https://"||value.substr(0,7)==="mailto:"||value[0]==="#"||value[0]==="/")){return""}}else if(name==="background"){REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)){return""}}else if(name==="style"){REGEXP_DEFAULT_ON_TAG_ATTR_7.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_7.test(value)){return""}REGEXP_DEFAULT_ON_TAG_ATTR_8.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_8.test(value)){REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)){return""}}value=cssFilter.process(value)}value=escapeAttrValue(value);return value}var REGEXP_LT=/</g;var REGEXP_GT=/>/g;var REGEXP_QUOTE=/"/g;var REGEXP_QUOTE_2=/&quot;/g;var REGEXP_ATTR_VALUE_1=/&#([a-zA-Z0-9]*);?/gim;var REGEXP_ATTR_VALUE_COLON=/&colon;?/gim;var REGEXP_ATTR_VALUE_NEWLINE=/&newline;?/gim;var REGEXP_DEFAULT_ON_TAG_ATTR_3=/\/\*|\*\//gm;var REGEXP_DEFAULT_ON_TAG_ATTR_4=/((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a)\:/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_5=/^[\s"'`]*(d\s*a\s*t\s*a\s*)\:/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_6=/^[\s"'`]*(d\s*a\s*t\s*a\s*)\:\s*image\//gi;var REGEXP_DEFAULT_ON_TAG_ATTR_7=/e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_8=/u\s*r\s*l\s*\(.*/gi;function escapeQuote(str){return str.replace(REGEXP_QUOTE,"&quot;")}function unescapeQuote(str){return str.replace(REGEXP_QUOTE_2,'"')}function escapeHtmlEntities(str){return str.replace(REGEXP_ATTR_VALUE_1,function replaceUnicode(str,code){return code[0]==="x"||code[0]==="X"?String.fromCharCode(parseInt(code.substr(1),16)):String.fromCharCode(parseInt(code,10))})}function escapeDangerHtml5Entities(str){return str.replace(REGEXP_ATTR_VALUE_COLON,":").replace(REGEXP_ATTR_VALUE_NEWLINE," ")}function clearNonPrintableCharacter(str){var str2="";for(var i=0,len=str.length;i<len;i++){str2+=str.charCodeAt(i)<32?" ":str.charAt(i)}return _.trim(str2)}function friendlyAttrValue(str){str=unescapeQuote(str);str=escapeHtmlEntities(str);str=escapeDangerHtml5Entities(str);str=clearNonPrintableCharacter(str);return str}function escapeAttrValue(str){str=escapeQuote(str);str=escapeHtml(str);return str}function onIgnoreTagStripAll(){return""}function StripTagBody(tags,next){if(typeof next!=="function"){next=function(){}}var isRemoveAllTag=!Array.isArray(tags);function isRemoveTag(tag){if(isRemoveAllTag)return true;return _.indexOf(tags,tag)!==-1}var removeList=[];var posStart=false;return{onIgnoreTag:function(tag,html,options){if(isRemoveTag(tag)){if(options.isClosing){var ret="[/removed]";var end=options.position+ret.length;removeList.push([posStart!==false?posStart:options.position,end]);posStart=false;return ret}else{if(!posStart){posStart=options.position}return"[removed]"}}else{return next(tag,html,options)}},remove:function(html){var rethtml="";var lastPos=0;_.forEach(removeList,function(pos){rethtml+=html.slice(lastPos,pos[0]);lastPos=pos[1]});rethtml+=html.slice(lastPos);return rethtml}}}function stripCommentTag(html){return html.replace(STRIP_COMMENT_TAG_REGEXP,"")}var STRIP_COMMENT_TAG_REGEXP=/<!--[\s\S]*?-->/g;function stripBlankChar(html){var chars=html.split("");chars=chars.filter(function(char){var c=char.charCodeAt(0);if(c===127)return false;if(c<=31){if(c===10||c===13)return true;return false}return true});return chars.join("")}exports.whiteList=getDefaultWhiteList();exports.getDefaultWhiteList=getDefaultWhiteList;exports.onTag=onTag;exports.onIgnoreTag=onIgnoreTag;exports.onTagAttr=onTagAttr;exports.onIgnoreTagAttr=onIgnoreTagAttr;exports.safeAttrValue=safeAttrValue;exports.escapeHtml=escapeHtml;exports.escapeQuote=escapeQuote;exports.unescapeQuote=unescapeQuote;exports.escapeHtmlEntities=escapeHtmlEntities;exports.escapeDangerHtml5Entities=escapeDangerHtml5Entities;exports.clearNonPrintableCharacter=clearNonPrintableCharacter;exports.friendlyAttrValue=friendlyAttrValue;exports.escapeAttrValue=escapeAttrValue;exports.onIgnoreTagStripAll=onIgnoreTagStripAll;exports.StripTagBody=StripTagBody;exports.stripCommentTag=stripCommentTag;exports.stripBlankChar=stripBlankChar;exports.cssFilter=defaultCSSFilter},{"./util":4,cssfilter:8}],2:[function(require,module,exports){var DEFAULT=require("./default");var parser=require("./parser");var FilterXSS=require("./xss");function filterXSS(html,options){var xss=new FilterXSS(options);return xss.process(html)}exports=module.exports=filterXSS;exports.FilterXSS=FilterXSS;for(var i in DEFAULT)exports[i]=DEFAULT[i];for(var i in parser)exports[i]=parser[i];if(typeof window!=="undefined"){window.filterXSS=module.exports}},{"./default":1,"./parser":3,"./xss":5}],3:[function(require,module,exports){var _=require("./util");function getTagName(html){var i=html.indexOf(" ");if(i===-1){var tagName=html.slice(1,-1)}else{var tagName=html.slice(1,i+1)}tagName=_.trim(tagName).toLowerCase();if(tagName.slice(0,1)==="/")tagName=tagName.slice(1);if(tagName.slice(-1)==="/")tagName=tagName.slice(0,-1);return tagName}function isClosing(html){return html.slice(0,2)==="</"}function parseTag(html,onTag,escapeHtml){"user strict";var rethtml="";var lastPos=0;var tagStart=false;var quoteStart=false;var currentPos=0;var len=html.length;var currentHtml="";var currentTagName="";for(currentPos=0;currentPos<len;currentPos++){var c=html.charAt(currentPos);if(tagStart===false){if(c==="<"){tagStart=currentPos;continue}}else{if(quoteStart===false){if(c==="<"){rethtml+=escapeHtml(html.slice(lastPos,currentPos));tagStart=currentPos;lastPos=currentPos;continue}if(c===">"){rethtml+=escapeHtml(html.slice(lastPos,tagStart));currentHtml=html.slice(tagStart,currentPos+1);currentTagName=getTagName(currentHtml);rethtml+=onTag(tagStart,rethtml.length,currentTagName,currentHtml,isClosing(currentHtml));lastPos=currentPos+1;tagStart=false;continue}if((c==='"'||c==="'")&&html.charAt(currentPos-1)==="="){quoteStart=c;continue}}else{if(c===quoteStart){quoteStart=false;continue}}}}if(lastPos<html.length){rethtml+=escapeHtml(html.substr(lastPos))}return rethtml}var REGEXP_ATTR_NAME=/[^a-zA-Z0-9_:\.\-]/gim;function parseAttr(html,onAttr){"user strict";var lastPos=0;var retAttrs=[];var tmpName=false;var len=html.length;function addAttr(name,value){name=_.trim(name);name=name.replace(REGEXP_ATTR_NAME,"").toLowerCase();if(name.length<1)return;var ret=onAttr(name,value||"");if(ret)retAttrs.push(ret)}for(var i=0;i<len;i++){var c=html.charAt(i);var v,j;if(tmpName===false&&c==="="){tmpName=html.slice(lastPos,i);lastPos=i+1;continue}if(tmpName!==false){if(i===lastPos&&(c==='"'||c==="'")&&html.charAt(i-1)==="="){j=html.indexOf(c,i+1);if(j===-1){break}else{v=_.trim(html.slice(lastPos+1,j));addAttr(tmpName,v);tmpName=false;i=j;lastPos=i+1;continue}}}if(c===" "){if(tmpName===false){j=findNextEqual(html,i);if(j===-1){v=_.trim(html.slice(lastPos,i));addAttr(v);tmpName=false;lastPos=i+1;continue}else{i=j-1;continue}}else{j=findBeforeEqual(html,i-1);if(j===-1){v=_.trim(html.slice(lastPos,i));v=stripQuoteWrap(v);addAttr(tmpName,v);tmpName=false;lastPos=i+1;continue}else{continue}}}}if(lastPos<html.length){if(tmpName===false){addAttr(html.slice(lastPos))}else{addAttr(tmpName,stripQuoteWrap(_.trim(html.slice(lastPos))))}}return _.trim(retAttrs.join(" "))}function findNextEqual(str,i){for(;i<str.length;i++){var c=str[i];if(c===" ")continue;if(c==="=")return i;return-1}}function findBeforeEqual(str,i){for(;i>0;i--){var c=str[i];if(c===" ")continue;if(c==="=")return i;return-1}}function isQuoteWrapString(text){if(text[0]==='"'&&text[text.length-1]==='"'||text[0]==="'"&&text[text.length-1]==="'"){return true}else{return false}}function stripQuoteWrap(text){if(isQuoteWrapString(text)){return text.substr(1,text.length-2)}else{return text}}exports.parseTag=parseTag;exports.parseAttr=parseAttr},{"./util":4}],4:[function(require,module,exports){module.exports={indexOf:function(arr,item){var i,j;if(Array.prototype.indexOf){return arr.indexOf(item)}for(i=0,j=arr.length;i<j;i++){if(arr[i]===item){return i}}return-1},forEach:function(arr,fn,scope){var i,j;if(Array.prototype.forEach){return arr.forEach(fn,scope)}for(i=0,j=arr.length;i<j;i++){fn.call(scope,arr[i],i,arr)}},trim:function(str){if(String.prototype.trim){return str.trim()}return str.replace(/(^\s*)|(\s*$)/g,"")}}},{}],5:[function(require,module,exports){var FilterCSS=require("cssfilter").FilterCSS;var DEFAULT=require("./default");var parser=require("./parser");var parseTag=parser.parseTag;var parseAttr=parser.parseAttr;var _=require("./util");function isNull(obj){return obj===undefined||obj===null}function getAttrs(html){var i=html.indexOf(" ");if(i===-1){return{html:"",closing:html[html.length-2]==="/"}}html=_.trim(html.slice(i+1,-1));var isClosing=html[html.length-1]==="/";if(isClosing)html=_.trim(html.slice(0,-1));return{html:html,closing:isClosing}}function FilterXSS(options){options=options||{};if(options.stripIgnoreTag){if(options.onIgnoreTag){console.error('Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time')}options.onIgnoreTag=DEFAULT.onIgnoreTagStripAll}options.whiteList=options.whiteList||DEFAULT.whiteList;options.onTag=options.onTag||DEFAULT.onTag;options.onTagAttr=options.onTagAttr||DEFAULT.onTagAttr;options.onIgnoreTag=options.onIgnoreTag||DEFAULT.onIgnoreTag;options.onIgnoreTagAttr=options.onIgnoreTagAttr||DEFAULT.onIgnoreTagAttr;options.safeAttrValue=options.safeAttrValue||DEFAULT.safeAttrValue;options.escapeHtml=options.escapeHtml||DEFAULT.escapeHtml;options.css=options.css||{};this.options=options;this.cssFilter=new FilterCSS(options.css)}FilterXSS.prototype.process=function(html){html=html||"";html=html.toString();if(!html)return"";var me=this;var options=me.options;var whiteList=options.whiteList;var onTag=options.onTag;var onIgnoreTag=options.onIgnoreTag;var onTagAttr=options.onTagAttr;var onIgnoreTagAttr=options.onIgnoreTagAttr;var safeAttrValue=options.safeAttrValue;var escapeHtml=options.escapeHtml;var cssFilter=me.cssFilter;if(options.stripBlankChar){html=DEFAULT.stripBlankChar(html)}if(!options.allowCommentTag){html=DEFAULT.stripCommentTag(html)}var stripIgnoreTagBody=false;if(options.stripIgnoreTagBody){var stripIgnoreTagBody=DEFAULT.StripTagBody(options.stripIgnoreTagBody,onIgnoreTag);onIgnoreTag=stripIgnoreTagBody.onIgnoreTag}var retHtml=parseTag(html,function(sourcePosition,position,tag,html,isClosing){var info={sourcePosition:sourcePosition,position:position,isClosing:isClosing,isWhite:tag in whiteList};var ret=onTag(tag,html,info);if(!isNull(ret))return ret;if(info.isWhite){if(info.isClosing){return"</"+tag+">"}var attrs=getAttrs(html);var whiteAttrList=whiteList[tag];var attrsHtml=parseAttr(attrs.html,function(name,value){var isWhiteAttr=_.indexOf(whiteAttrList,name)!==-1;var ret=onTagAttr(tag,name,value,isWhiteAttr);if(!isNull(ret))return ret;if(isWhiteAttr){value=safeAttrValue(tag,name,value,cssFilter);if(value){return name+'="'+value+'"'}else{return name}}else{var ret=onIgnoreTagAttr(tag,name,value,isWhiteAttr);if(!isNull(ret))return ret;return}});var html="<"+tag;if(attrsHtml)html+=" "+attrsHtml;if(attrs.closing)html+=" /";html+=">";return html}else{var ret=onIgnoreTag(tag,html,info);if(!isNull(ret))return ret;return escapeHtml(html)}},escapeHtml);if(stripIgnoreTagBody){retHtml=stripIgnoreTagBody.remove(retHtml)}return retHtml};module.exports=FilterXSS},{"./default":1,"./parser":3,"./util":4,cssfilter:8}],6:[function(require,module,exports){var DEFAULT=require("./default");var parseStyle=require("./parser");var _=require("./util");function isNull(obj){return obj===undefined||obj===null}function FilterCSS(options){options=options||{};options.whiteList=options.whiteList||DEFAULT.whiteList;options.onAttr=options.onAttr||DEFAULT.onAttr;options.onIgnoreAttr=options.onIgnoreAttr||DEFAULT.onIgnoreAttr;this.options=options}FilterCSS.prototype.process=function(css){css=css||"";css=css.toString();if(!css)return"";var me=this;var options=me.options;var whiteList=options.whiteList;var onAttr=options.onAttr;var onIgnoreAttr=options.onIgnoreAttr;var retCSS=parseStyle(css,function(sourcePosition,position,name,value,source){var check=whiteList[name];var isWhite=false;if(check===true)isWhite=check;else if(typeof check==="function")isWhite=check(value);else if(check instanceof RegExp)isWhite=check.test(value);if(isWhite!==true)isWhite=false;var opts={position:position,sourcePosition:sourcePosition,source:source,isWhite:isWhite};if(isWhite){var ret=onAttr(name,value,opts);if(isNull(ret)){return name+":"+value}else{return ret}}else{var ret=onIgnoreAttr(name,value,opts);if(!isNull(ret)){return ret}}});return retCSS};module.exports=FilterCSS},{"./default":7,"./parser":9,"./util":10}],7:[function(require,module,exports){function getDefaultWhiteList(){var whiteList={};whiteList["align-content"]=false;whiteList["align-items"]=false;whiteList["align-self"]=false;whiteList["alignment-adjust"]=false;whiteList["alignment-baseline"]=false;whiteList["all"]=false;whiteList["anchor-point"]=false;whiteList["animation"]=false;whiteList["animation-delay"]=false;whiteList["animation-direction"]=false;whiteList["animation-duration"]=false;whiteList["animation-fill-mode"]=false;whiteList["animation-iteration-count"]=false;whiteList["animation-name"]=false;whiteList["animation-play-state"]=false;whiteList["animation-timing-function"]=false;whiteList["azimuth"]=false;whiteList["backface-visibility"]=false;whiteList["background"]=true;whiteList["background-attachment"]=true;whiteList["background-clip"]=true;whiteList["background-color"]=true;whiteList["background-image"]=true;whiteList["background-origin"]=true;whiteList["background-position"]=true;whiteList["background-repeat"]=true;whiteList["background-size"]=true;whiteList["baseline-shift"]=false;whiteList["binding"]=false;whiteList["bleed"]=false;whiteList["bookmark-label"]=false;whiteList["bookmark-level"]=false;whiteList["bookmark-state"]=false;whiteList["border"]=true;whiteList["border-bottom"]=true;whiteList["border-bottom-color"]=true;whiteList["border-bottom-left-radius"]=true;whiteList["border-bottom-right-radius"]=true;whiteList["border-bottom-style"]=true;whiteList["border-bottom-width"]=true;whiteList["border-collapse"]=true;whiteList["border-color"]=true;whiteList["border-image"]=true;whiteList["border-image-outset"]=true;whiteList["border-image-repeat"]=true;whiteList["border-image-slice"]=true;whiteList["border-image-source"]=true;whiteList["border-image-width"]=true;whiteList["border-left"]=true;whiteList["border-left-color"]=true;whiteList["border-left-style"]=true;whiteList["border-left-width"]=true;whiteList["border-radius"]=true;whiteList["border-right"]=true;whiteList["border-right-color"]=true;whiteList["border-right-style"]=true;whiteList["border-right-width"]=true;whiteList["border-spacing"]=true;whiteList["border-style"]=true;whiteList["border-top"]=true;whiteList["border-top-color"]=true;whiteList["border-top-left-radius"]=true;whiteList["border-top-right-radius"]=true;whiteList["border-top-style"]=true;whiteList["border-top-width"]=true;whiteList["border-width"]=true;whiteList["bottom"]=false;whiteList["box-decoration-break"]=true;whiteList["box-shadow"]=true;whiteList["box-sizing"]=true;whiteList["box-snap"]=true;whiteList["box-suppress"]=true;whiteList["break-after"]=true;whiteList["break-before"]=true;whiteList["break-inside"]=true;whiteList["caption-side"]=false;whiteList["chains"]=false;whiteList["clear"]=true;whiteList["clip"]=false;whiteList["clip-path"]=false;whiteList["clip-rule"]=false;whiteList["color"]=true;whiteList["color-interpolation-filters"]=true;whiteList["column-count"]=false;whiteList["column-fill"]=false;whiteList["column-gap"]=false;whiteList["column-rule"]=false;whiteList["column-rule-color"]=false;whiteList["column-rule-style"]=false;whiteList["column-rule-width"]=false;whiteList["column-span"]=false;whiteList["column-width"]=false;whiteList["columns"]=false;whiteList["contain"]=false;whiteList["content"]=false;whiteList["counter-increment"]=false;whiteList["counter-reset"]=false;whiteList["counter-set"]=false;whiteList["crop"]=false;whiteList["cue"]=false;whiteList["cue-after"]=false;whiteList["cue-before"]=false;whiteList["cursor"]=false;whiteList["direction"]=false;whiteList["display"]=true;whiteList["display-inside"]=true;whiteList["display-list"]=true;whiteList["display-outside"]=true;whiteList["dominant-baseline"]=false;whiteList["elevation"]=false;whiteList["empty-cells"]=false;whiteList["filter"]=false;whiteList["flex"]=false;whiteList["flex-basis"]=false;whiteList["flex-direction"]=false;whiteList["flex-flow"]=false;whiteList["flex-grow"]=false;whiteList["flex-shrink"]=false;whiteList["flex-wrap"]=false;whiteList["float"]=false;whiteList["float-offset"]=false;whiteList["flood-color"]=false;whiteList["flood-opacity"]=false;whiteList["flow-from"]=false;whiteList["flow-into"]=false;whiteList["font"]=true;whiteList["font-family"]=true;whiteList["font-feature-settings"]=true;whiteList["font-kerning"]=true;whiteList["font-language-override"]=true;whiteList["font-size"]=true;whiteList["font-size-adjust"]=true;whiteList["font-stretch"]=true;whiteList["font-style"]=true;whiteList["font-synthesis"]=true;whiteList["font-variant"]=true;whiteList["font-variant-alternates"]=true;whiteList["font-variant-caps"]=true;whiteList["font-variant-east-asian"]=true;whiteList["font-variant-ligatures"]=true;whiteList["font-variant-numeric"]=true;whiteList["font-variant-position"]=true;whiteList["font-weight"]=true;whiteList["grid"]=false;whiteList["grid-area"]=false;whiteList["grid-auto-columns"]=false;whiteList["grid-auto-flow"]=false;whiteList["grid-auto-rows"]=false;whiteList["grid-column"]=false;whiteList["grid-column-end"]=false;whiteList["grid-column-start"]=false;whiteList["grid-row"]=false;whiteList["grid-row-end"]=false;whiteList["grid-row-start"]=false;whiteList["grid-template"]=false;whiteList["grid-template-areas"]=false;whiteList["grid-template-columns"]=false;whiteList["grid-template-rows"]=false;whiteList["hanging-punctuation"]=false;whiteList["height"]=true;whiteList["hyphens"]=false;whiteList["icon"]=false;whiteList["image-orientation"]=false;whiteList["image-resolution"]=false;whiteList["ime-mode"]=false;whiteList["initial-letters"]=false;whiteList["inline-box-align"]=false;whiteList["justify-content"]=false;whiteList["justify-items"]=false;whiteList["justify-self"]=false;whiteList["left"]=false;whiteList["letter-spacing"]=true;whiteList["lighting-color"]=true;whiteList["line-box-contain"]=false;whiteList["line-break"]=false;whiteList["line-grid"]=false;whiteList["line-height"]=false;whiteList["line-snap"]=false;whiteList["line-stacking"]=false;whiteList["line-stacking-ruby"]=false;whiteList["line-stacking-shift"]=false;whiteList["line-stacking-strategy"]=false;whiteList["list-style"]=true;whiteList["list-style-image"]=true;whiteList["list-style-position"]=true;whiteList["list-style-type"]=true;whiteList["margin"]=true;whiteList["margin-bottom"]=true;whiteList["margin-left"]=true;whiteList["margin-right"]=true;whiteList["margin-top"]=true;whiteList["marker-offset"]=false;whiteList["marker-side"]=false;whiteList["marks"]=false;whiteList["mask"]=false;whiteList["mask-box"]=false;whiteList["mask-box-outset"]=false;whiteList["mask-box-repeat"]=false;whiteList["mask-box-slice"]=false;whiteList["mask-box-source"]=false;whiteList["mask-box-width"]=false;whiteList["mask-clip"]=false;whiteList["mask-image"]=false;whiteList["mask-origin"]=false;whiteList["mask-position"]=false;whiteList["mask-repeat"]=false;whiteList["mask-size"]=false;whiteList["mask-source-type"]=false;whiteList["mask-type"]=false;whiteList["max-height"]=true;whiteList["max-lines"]=false;whiteList["max-width"]=true;whiteList["min-height"]=true;whiteList["min-width"]=true;whiteList["move-to"]=false;whiteList["nav-down"]=false;whiteList["nav-index"]=false;whiteList["nav-left"]=false;whiteList["nav-right"]=false;whiteList["nav-up"]=false;whiteList["object-fit"]=false;whiteList["object-position"]=false;whiteList["opacity"]=false;whiteList["order"]=false;whiteList["orphans"]=false;whiteList["outline"]=false;whiteList["outline-color"]=false;whiteList["outline-offset"]=false;whiteList["outline-style"]=false;whiteList["outline-width"]=false;whiteList["overflow"]=false;whiteList["overflow-wrap"]=false;whiteList["overflow-x"]=false;whiteList["overflow-y"]=false;whiteList["padding"]=true;whiteList["padding-bottom"]=true;whiteList["padding-left"]=true;whiteList["padding-right"]=true;whiteList["padding-top"]=true;whiteList["page"]=false;whiteList["page-break-after"]=false;whiteList["page-break-before"]=false;whiteList["page-break-inside"]=false;whiteList["page-policy"]=false;whiteList["pause"]=false;whiteList["pause-after"]=false;whiteList["pause-before"]=false;whiteList["perspective"]=false;whiteList["perspective-origin"]=false;whiteList["pitch"]=false;whiteList["pitch-range"]=false;whiteList["play-during"]=false;whiteList["position"]=false;whiteList["presentation-level"]=false;whiteList["quotes"]=false;whiteList["region-fragment"]=false;whiteList["resize"]=false;whiteList["rest"]=false;whiteList["rest-after"]=false;whiteList["rest-before"]=false;whiteList["richness"]=false;whiteList["right"]=false;whiteList["rotation"]=false;whiteList["rotation-point"]=false;whiteList["ruby-align"]=false;whiteList["ruby-merge"]=false;whiteList["ruby-position"]=false;whiteList["shape-image-threshold"]=false;whiteList["shape-outside"]=false;whiteList["shape-margin"]=false;whiteList["size"]=false;whiteList["speak"]=false;whiteList["speak-as"]=false;whiteList["speak-header"]=false;whiteList["speak-numeral"]=false;whiteList["speak-punctuation"]=false;whiteList["speech-rate"]=false;whiteList["stress"]=false;whiteList["string-set"]=false;whiteList["tab-size"]=false;whiteList["table-layout"]=false;whiteList["text-align"]=true;whiteList["text-align-last"]=true;whiteList["text-combine-upright"]=true;whiteList["text-decoration"]=true;whiteList["text-decoration-color"]=true;whiteList["text-decoration-line"]=true;whiteList["text-decoration-skip"]=true;whiteList["text-decoration-style"]=true;whiteList["text-emphasis"]=true;whiteList["text-emphasis-color"]=true;whiteList["text-emphasis-position"]=true;whiteList["text-emphasis-style"]=true;whiteList["text-height"]=true;whiteList["text-indent"]=true;whiteList["text-justify"]=true;whiteList["text-orientation"]=true;whiteList["text-overflow"]=true;whiteList["text-shadow"]=true;whiteList["text-space-collapse"]=true;whiteList["text-transform"]=true;whiteList["text-underline-position"]=true;whiteList["text-wrap"]=true;whiteList["top"]=false;whiteList["transform"]=false;whiteList["transform-origin"]=false;whiteList["transform-style"]=false;whiteList["transition"]=false;whiteList["transition-delay"]=false;whiteList["transition-duration"]=false;whiteList["transition-property"]=false;whiteList["transition-timing-function"]=false;whiteList["unicode-bidi"]=false;whiteList["vertical-align"]=false;whiteList["visibility"]=false;whiteList["voice-balance"]=false;whiteList["voice-duration"]=false;whiteList["voice-family"]=false;whiteList["voice-pitch"]=false;whiteList["voice-range"]=false;whiteList["voice-rate"]=false;whiteList["voice-stress"]=false;whiteList["voice-volume"]=false;whiteList["volume"]=false;whiteList["white-space"]=false;whiteList["widows"]=false;whiteList["width"]=true;whiteList["will-change"]=false;whiteList["word-break"]=true;whiteList["word-spacing"]=true;whiteList["word-wrap"]=true;whiteList["wrap-flow"]=false;whiteList["wrap-through"]=false;whiteList["writing-mode"]=false;whiteList["z-index"]=false;return whiteList}function onAttr(name,value,options){}function onIgnoreAttr(name,value,options){}exports.whiteList=getDefaultWhiteList();exports.getDefaultWhiteList=getDefaultWhiteList;exports.onAttr=onAttr;exports.onIgnoreAttr=onIgnoreAttr},{}],8:[function(require,module,exports){var DEFAULT=require("./default");var FilterCSS=require("./css");function filterCSS(html,options){var xss=new FilterCSS(options);return xss.process(html)}exports=module.exports=filterCSS;exports.FilterCSS=FilterCSS;for(var i in DEFAULT)exports[i]=DEFAULT[i];if(typeof window!=="undefined"){window.filterCSS=module.exports}},{"./css":6,"./default":7}],9:[function(require,module,exports){var _=require("./util");function parseStyle(css,onAttr){css=_.trimRight(css);if(css[css.length-1]!==";")css+=";";var cssLength=css.length;var isParenthesisOpen=false;var lastPos=0;var i=0;var retCSS="";function addNewAttr(){if(!isParenthesisOpen){var source=_.trim(css.slice(lastPos,i));var j=source.indexOf(":");if(j!==-1){var name=_.trim(source.slice(0,j));var value=_.trim(source.slice(j+1));if(name){var ret=onAttr(lastPos,retCSS.length,name,value,source);if(ret)retCSS+=ret+"; "}}}lastPos=i+1}for(;i<cssLength;i++){var c=css[i];if(c==="/"&&css[i+1]==="*"){var j=css.indexOf("*/",i+2);if(j===-1)break;i=j+1;lastPos=i+1;isParenthesisOpen=false}else if(c==="("){isParenthesisOpen=true}else if(c===")"){isParenthesisOpen=false}else if(c===";"){if(isParenthesisOpen){}else{addNewAttr()}}else if(c==="\n"){addNewAttr()}}return _.trim(retCSS)}module.exports=parseStyle},{"./util":10}],10:[function(require,module,exports){module.exports={indexOf:function(arr,item){var i,j;if(Array.prototype.indexOf){return arr.indexOf(item)}for(i=0,j=arr.length;i<j;i++){if(arr[i]===item){return i}}return-1},forEach:function(arr,fn,scope){var i,j;if(Array.prototype.forEach){return arr.forEach(fn,scope)}for(i=0,j=arr.length;i<j;i++){fn.call(scope,arr[i],i,arr)}},trim:function(str){if(String.prototype.trim){return str.trim()}return str.replace(/(^\s*)|(\s*$)/g,"")},trimRight:function(str){if(String.prototype.trimRight){return str.trimRight()}return str.replace(/(\s*$)/g,"")}}},{}]},{},[2]);
define("pretty-text/allow-lister", ["exports", "discourse-common/lib/deprecated"], function (_exports, _deprecated) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.DEFAULT_LIST = _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  // to match:
  // abcd
  // abcd[test]
  // abcd[test=bob]
  var ALLOWLIST_REGEX = /([^\[]+)(\[([^=]+)(=(.*))?\])?/;

  var AllowLister = /*#__PURE__*/function () {
    function AllowLister(options) {
      var _this = this;

      _classCallCheck(this, AllowLister);

      this._enabled = {
        default: true
      };
      this._allowedHrefSchemes = options && options.allowedHrefSchemes || [];
      this._allowedIframes = options && options.allowedIframes || [];
      this._rawFeatures = [["default", DEFAULT_LIST]];
      this._cache = null;

      if (options && options.features) {
        Object.keys(options.features).forEach(function (f) {
          if (options.features[f]) {
            _this._enabled[f] = true;
          }
        });
      }
    }

    _createClass(AllowLister, [{
      key: "allowListFeature",
      value: function allowListFeature(feature, info) {
        this._rawFeatures.push([feature, info]);
      }
    }, {
      key: "whiteListFeature",
      value: function whiteListFeature(feature, info) {
        (0, _deprecated.default)("`whiteListFeature` has been replaced with `allowListFeature`", {
          since: "2.6.0.beta.4",
          dropFrom: "2.7.0"
        });
        this.allowListFeature(feature, info);
      }
    }, {
      key: "disable",
      value: function disable(feature) {
        this._enabled[feature] = false;
        this._cache = null;
      }
    }, {
      key: "enable",
      value: function enable(feature) {
        this._enabled[feature] = true;
        this._cache = null;
      }
    }, {
      key: "_buildCache",
      value: function _buildCache() {
        var _this2 = this;

        var tagList = {};
        var attrList = {};
        var custom = [];

        this._rawFeatures.forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              name = _ref2[0],
              info = _ref2[1];

          if (!_this2._enabled[name]) {
            return;
          }

          if (info.custom) {
            custom.push(info.custom);
            return;
          }

          if (typeof info === "string") {
            info = [info];
          }

          (info || []).forEach(function (tag) {
            var classes = tag.split(".");
            var tagWithAttr = classes.shift();
            var m = ALLOWLIST_REGEX.exec(tagWithAttr);

            if (m) {
              var _m = _slicedToArray(m, 6),
                  tagname = _m[1],
                  attr = _m[3],
                  val = _m[5];

              tagList[tagname] = [];
              var attrs = attrList[tagname] = attrList[tagname] || {};

              if (classes.length > 0) {
                attrs["class"] = (attrs["class"] || []).concat(classes);
              }

              if (attr) {
                var attrInfo = attrs[attr] = attrs[attr] || [];

                if (val) {
                  attrInfo.push(val);
                } else {
                  attrs[attr] = ["*"];
                }
              }
            }
          });
        });

        this._cache = {
          custom: custom,
          allowList: {
            tagList: tagList,
            attrList: attrList
          }
        };
      }
    }, {
      key: "_ensureCache",
      value: function _ensureCache() {
        if (!this._cache) {
          this._buildCache();
        }
      }
    }, {
      key: "getAllowList",
      value: function getAllowList() {
        this._ensureCache();

        return this._cache.allowList;
      }
    }, {
      key: "getWhiteList",
      value: function getWhiteList() {
        (0, _deprecated.default)("`getWhiteList` has been replaced with `getAllowList`", {
          since: "2.6.0.beta.4",
          dropFrom: "2.7.0"
        });
        return this.getAllowList();
      }
    }, {
      key: "getCustom",
      value: function getCustom() {
        this._ensureCache();

        return this._cache.custom;
      }
    }, {
      key: "getAllowedHrefSchemes",
      value: function getAllowedHrefSchemes() {
        return this._allowedHrefSchemes;
      }
    }, {
      key: "getAllowedIframes",
      value: function getAllowedIframes() {
        return this._allowedIframes;
      }
    }]);

    return AllowLister;
  }(); // Only add to `default` when you always want your allowlist to occur. In other words,
  // don't change this for a plugin or a feature that can be disabled


  _exports.default = AllowLister;
  var DEFAULT_LIST = ["a.attachment", "a.hashtag", "a.mention", "a.mention-group", "a.onebox", "a.inline-onebox", "a.inline-onebox-loading", "a[data-bbcode]", "a[name]", "a[rel=nofollow]", "a[rel=ugc]", "a[target=_blank]", "a[title]", "abbr[title]", "aside.quote", "aside[data-*]", "audio", "audio[controls]", "audio[preload]", "b", "big", "blockquote", "br", "code", "dd", "del", "div", "div.quote-controls", "div.title", "div[align]", "div[lang]", "div[data-*]"
  /* This may seem a bit much but polls does
      it anyway and this is needed for themes,
      special code in sanitizer handles data-*
      nothing exists for data-theme-* and we
      don't want to slow sanitize for this case
    */
  , "div[dir]", "dl", "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "iframe", "iframe[frameborder]", "iframe[height]", "iframe[marginheight]", "iframe[marginwidth]", "iframe[width]", "iframe[allowfullscreen]", "img[alt]", "img[height]", "img[title]", "img[width]", "img[data-thumbnail]", "ins", "kbd", "li", "mark", "ol", "ol[start]", "p", "p[lang]", "picture", "pre", "s", "small", "span[lang]", "span.excerpt", "div.excerpt", "div.video-container", "div.onebox-placeholder-container", "span.placeholder-icon video", "span.hashtag", "span.mention", "strike", "strong", "sub", "sup", "source[data-orig-src]", "source[src]", "source[srcset]", "source[type]", "track", "track[default]", "track[label]", "track[kind]", "track[src]", "track[srclang]", "ul", "video", // video[autoplay] handled by sanitizer.js
  "video[controls]", "video[controlslist]", "video[crossorigin]", "video[height]", "video[loop]", "video[muted]", "video[playsinline]", "video[poster]", "video[preload]", "video[width]", "ruby", "ruby[lang]", "rb", "rb[lang]", "rp", "rt", "rt[lang]"];
  _exports.DEFAULT_LIST = DEFAULT_LIST;
});
define("pretty-text/white-lister", ["exports", "pretty-text/allow-lister", "discourse-common/lib/deprecated"], function (_exports, _allowLister, _deprecated) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.DEFAULT_LIST = _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  var WhiteLister = /*#__PURE__*/function (_AllowLister) {
    _inherits(WhiteLister, _AllowLister);

    var _super = _createSuper(WhiteLister);

    function WhiteLister(options) {
      _classCallCheck(this, WhiteLister);

      (0, _deprecated.default)("`WhiteLister` has been replaced with `AllowLister`", {
        since: "2.6.0.beta.4",
        dropFrom: "2.7.0"
      });
      return _super.call(this, options);
    }

    return WhiteLister;
  }(_allowLister.default);

  _exports.default = WhiteLister;
  var DEFAULT_LIST = _allowLister.DEFAULT_LIST;
  _exports.DEFAULT_LIST = DEFAULT_LIST;
});
define("pretty-text/sanitizer", ["exports", "xss"], function (_exports, _xss) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.escape = escape;
  _exports.hrefAllowed = hrefAllowed;
  _exports.sanitize = sanitize;

  function attr(name, value) {
    if (value) {
      return "".concat(name, "=\"").concat(_xss.default.escapeAttrValue(value), "\"");
    }

    return name;
  }

  var ESCAPE_REPLACEMENTS = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };
  var BAD_CHARS = /[&<>"'`]/g;
  var POSSIBLE_CHARS = /[&<>"'`]/;

  function escapeChar(chr) {
    return ESCAPE_REPLACEMENTS[chr];
  }

  function escape(string) {
    if (string === null) {
      return "";
    } else if (!string) {
      return string + "";
    } // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.


    string = "" + string;

    if (!POSSIBLE_CHARS.test(string)) {
      return string;
    }

    return string.replace(BAD_CHARS, escapeChar);
  }

  function hrefAllowed(href, extraHrefMatchers) {
    // escape single quotes
    href = href.replace(/'/g, "%27"); // absolute urls

    if (/^(https?:)?\/\/[\w\.\-]+/i.test(href)) {
      return href;
    } // relative urls


    if (/^\/[\w\.\-]+/i.test(href)) {
      return href;
    } // anchors


    if (/^#[\w\.\-]+/i.test(href)) {
      return href;
    } // mailtos


    if (/^mailto:[\w\.\-@]+/i.test(href)) {
      return href;
    }

    if (extraHrefMatchers && extraHrefMatchers.length > 0) {
      for (var i = 0; i < extraHrefMatchers.length; i++) {
        if (extraHrefMatchers[i].test(href)) {
          return href;
        }
      }
    }
  }

  function sanitize(text, allowLister) {
    if (!text) {
      return "";
    } // Allow things like <3 and <_<


    text = text.replace(/<([^A-Za-z\/\!]|$)/g, "&lt;$1");
    var allowList = allowLister.getAllowList(),
        allowedHrefSchemes = allowLister.getAllowedHrefSchemes(),
        allowedIframes = allowLister.getAllowedIframes();
    var extraHrefMatchers = null;

    if (allowedHrefSchemes && allowedHrefSchemes.length > 0) {
      extraHrefMatchers = [new RegExp("^(" + allowedHrefSchemes.join("|") + ")://[\\w\\.\\-]+", "i")];

      if (allowedHrefSchemes.includes("tel")) {
        extraHrefMatchers.push(new RegExp("^tel://\\+?[\\w\\.\\-]+", "i"));
      }
    }

    var result = (0, _xss.default)(text, {
      whiteList: allowList.tagList,
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "table"],
      onIgnoreTagAttr: function onIgnoreTagAttr(tag, name, value) {
        var forTag = allowList.attrList[tag];

        if (forTag) {
          var forAttr = forTag[name];

          if (forAttr && (forAttr.indexOf("*") !== -1 || forAttr.indexOf(value) !== -1) || name.indexOf("data-") === 0 && forTag["data-*"] || tag === "a" && name === "href" && hrefAllowed(value, extraHrefMatchers) || tag === "img" && name === "src" && (/^data:image.*$/i.test(value) || hrefAllowed(value, extraHrefMatchers)) || tag === "iframe" && name === "src" && allowedIframes.some(function (i) {
            return value.toLowerCase().indexOf((i || "").toLowerCase()) === 0;
          })) {
            return attr(name, value);
          }

          if (tag === "iframe" && name === "src") {
            return "-STRIP-";
          }

          if (tag === "video" && name === "autoplay") {
            // This might give us duplicate 'muted' atttributes
            // but they will be deduped by later processing
            return "autoplay muted";
          } // Heading ids must begin with `heading--`


          if (["h1", "h2", "h3", "h4", "h5", "h6"].indexOf(tag) !== -1 && value.match(/^heading\-\-[a-zA-Z0-9\-\_]+$/)) {
            return attr(name, value);
          }

          var custom = allowLister.getCustom();

          for (var i = 0; i < custom.length; i++) {
            var fn = custom[i];

            if (fn(tag, name, value)) {
              return attr(name, value);
            }
          }
        }
      }
    });
    return result.replace(/\[removed\]/g, "").replace(/\<iframe[^>]+\-STRIP\-[^>]*>[^<]*<\/iframe>/g, "").replace(/&(?![#\w]+;)/g, "&amp;").replace(/&#39;/g, "'").replace(/ \/>/g, ">");
  }
});
define("pretty-text/oneboxer", ["exports", "pretty-text/oneboxer-cache", "@ember/runloop"], function (_exports, _oneboxerCache, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.resetCache = resetCache;
  _exports.load = load;
  _exports.LOADING_ONEBOX_CSS_CLASS = void 0;
  var timeout;
  var loadingQueue = [];
  var LOADING_ONEBOX_CSS_CLASS = "loading-onebox";
  _exports.LOADING_ONEBOX_CSS_CLASS = LOADING_ONEBOX_CSS_CLASS;

  function resetCache() {
    loadingQueue.clear();
    (0, _oneboxerCache.resetLocalCache)();
    (0, _oneboxerCache.resetFailedCache)();
  }

  function resolveSize(img) {
    $(img).addClass("size-resolved");

    if (img.width > 0 && img.width === img.height) {
      $(img).addClass("onebox-avatar");
    }
  } // Detect square images and apply smaller onebox-avatar class


  function applySquareGenericOnebox($elem) {
    if (!$elem.hasClass("allowlistedgeneric")) {
      return;
    }

    var $img = $elem.find(".onebox-body img.thumbnail");
    var img = $img[0]; // already resolved... skip

    if ($img.length !== 1 || $img.hasClass("size-resolved")) {
      return;
    }

    if (img.complete) {
      resolveSize(img);
    } else {
      $img.on("load.onebox", function () {
        resolveSize(img);
        $img.off("load.onebox");
      });
    }
  }

  function loadNext(ajax) {
    if (loadingQueue.length === 0) {
      timeout = null;
      return;
    }

    var timeoutMs = 150;
    var removeLoading = true;

    var _loadingQueue$shift = loadingQueue.shift(),
        url = _loadingQueue$shift.url,
        refresh = _loadingQueue$shift.refresh,
        $elem = _loadingQueue$shift.$elem,
        categoryId = _loadingQueue$shift.categoryId,
        topicId = _loadingQueue$shift.topicId; // Retrieve the onebox


    return ajax("/onebox", {
      dataType: "html",
      data: {
        url: url,
        refresh: refresh,
        category_id: categoryId,
        topic_id: topicId
      },
      cache: true
    }).then(function (html) {
      var $html = $(html);
      (0, _oneboxerCache.setLocalCache)((0, _oneboxerCache.normalize)(url), $html);
      $elem.replaceWith($html);
      applySquareGenericOnebox($html);
    }, function (result) {
      if (result && result.jqXHR && result.jqXHR.status === 429) {
        timeoutMs = 2000;
        removeLoading = false;
        loadingQueue.unshift({
          url: url,
          refresh: refresh,
          $elem: $elem,
          categoryId: categoryId,
          topicId: topicId
        });
      } else {
        (0, _oneboxerCache.setFailedCache)((0, _oneboxerCache.normalize)(url), true);
      }
    }).finally(function () {
      timeout = (0, _runloop.later)(function () {
        return loadNext(ajax);
      }, timeoutMs);

      if (removeLoading) {
        $elem.removeClass(LOADING_ONEBOX_CSS_CLASS);
        $elem.data("onebox-loaded");
      }
    });
  } // Perform a lookup of a onebox based an anchor $element.
  // It will insert a loading indicator and remove it when the loading is complete or fails.


  function load(_ref) {
    var elem = _ref.elem,
        _ref$refresh = _ref.refresh,
        refresh = _ref$refresh === void 0 ? true : _ref$refresh,
        ajax = _ref.ajax,
        _ref$synchronous = _ref.synchronous,
        synchronous = _ref$synchronous === void 0 ? false : _ref$synchronous,
        categoryId = _ref.categoryId,
        topicId = _ref.topicId;
    var $elem = $(elem); // If the onebox has loaded or is loading, return

    if ($elem.data("onebox-loaded")) {
      return;
    }

    if ($elem.hasClass(LOADING_ONEBOX_CSS_CLASS)) {
      return;
    }

    var url = elem.href; // Unless we're forcing a refresh...

    if (!refresh) {
      // If we have it in our cache, return it.
      var cached = _oneboxerCache.localCache[(0, _oneboxerCache.normalize)(url)];

      if (cached) {
        return cached.prop("outerHTML");
      } // If the request failed, don't do anything


      var failed = _oneboxerCache.failedCache[(0, _oneboxerCache.normalize)(url)];

      if (failed) {
        return;
      }
    } // Add the loading CSS class


    $elem.addClass(LOADING_ONEBOX_CSS_CLASS); // Add to the loading queue

    loadingQueue.push({
      url: url,
      refresh: refresh,
      $elem: $elem,
      categoryId: categoryId,
      topicId: topicId
    }); // Load next url in queue

    if (synchronous) {
      return loadNext(ajax);
    } else {
      timeout = timeout || (0, _runloop.later)(function () {
        return loadNext(ajax);
      }, 150);
    }
  }
});
define("pretty-text/oneboxer-cache", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.resetLocalCache = resetLocalCache;
  _exports.resetFailedCache = resetFailedCache;
  _exports.setLocalCache = setLocalCache;
  _exports.setFailedCache = setFailedCache;
  _exports.normalize = normalize;
  _exports.lookupCache = lookupCache;
  _exports.failedCache = _exports.localCache = void 0;
  var localCache = {};
  _exports.localCache = localCache;
  var failedCache = {}; // Sometimes jQuery will return URLs with trailing slashes when the
  // `href` didn't have them.

  _exports.failedCache = failedCache;

  function resetLocalCache() {
    _exports.localCache = localCache = {};
  }

  function resetFailedCache() {
    _exports.failedCache = failedCache = {};
  }

  function setLocalCache(key, value) {
    localCache[key] = value;
  }

  function setFailedCache(key, value) {
    failedCache[key] = value;
  }

  function normalize(url) {
    return url.replace(/\/$/, "");
  }

  function lookupCache(url) {
    var cached = localCache[normalize(url)];
    return cached && cached.prop("outerHTML");
  }
});
define("pretty-text/inline-oneboxer", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.applyInlineOneboxes = applyInlineOneboxes;
  _exports.cachedInlineOnebox = cachedInlineOnebox;
  _exports.applyCachedInlineOnebox = applyCachedInlineOnebox;
  _exports.deleteCachedInlineOnebox = deleteCachedInlineOnebox;
  var _cache = {};

  function applyInlineOneboxes(inline, ajax, opts) {
    opts = opts || {};
    Object.keys(inline).forEach(function (url) {
      // cache a blank locally, so we never trigger a lookup
      _cache[url] = {};
    });
    return ajax("/inline-onebox", {
      data: {
        urls: Object.keys(inline),
        category_id: opts.categoryId,
        topic_id: opts.topicId
      }
    }).then(function (result) {
      result["inline-oneboxes"].forEach(function (onebox) {
        if (onebox.title) {
          _cache[onebox.url] = onebox;
          var links = inline[onebox.url] || [];
          links.forEach(function (link) {
            $(link).text(onebox.title).addClass("inline-onebox").removeClass("inline-onebox-loading");
          });
        }
      });
    });
  }

  function cachedInlineOnebox(url) {
    return _cache[url];
  }

  function applyCachedInlineOnebox(url, onebox) {
    return _cache[url] = onebox;
  }

  function deleteCachedInlineOnebox(url) {
    return delete _cache[url];
  }
});
define("pretty-text/upload-short-url", ["exports", "I18n", "discourse-common/lib/debounce"], function (_exports, _I18n, _debounce) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.lookupCachedUploadUrl = lookupCachedUploadUrl;
  _exports.lookupUncachedUploadUrls = lookupUncachedUploadUrls;
  _exports.cacheShortUploadUrl = cacheShortUploadUrl;
  _exports.resetCache = resetCache;
  _exports.resolveAllShortUrls = resolveAllShortUrls;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var _cache = {};

  function lookupCachedUploadUrl(shortUrl) {
    return _cache[shortUrl] || {};
  }

  var MISSING = "missing";

  function lookupUncachedUploadUrls(urls, ajax) {
    urls = urls.filter(Boolean);

    if (urls.length === 0) {
      return;
    }

    return ajax("/uploads/lookup-urls", {
      type: "POST",
      data: {
        short_urls: urls
      }
    }).then(function (uploads) {
      uploads.forEach(function (upload) {
        cacheShortUploadUrl(upload.short_url, {
          url: upload.url,
          short_path: upload.short_path
        });
      });
      urls.forEach(function (url) {
        return cacheShortUploadUrl(url, {
          url: lookupCachedUploadUrl(url).url || MISSING,
          short_path: lookupCachedUploadUrl(url).short_path || MISSING
        });
      });
      return uploads;
    });
  }

  function cacheShortUploadUrl(shortUrl, value) {
    _cache[shortUrl] = value;
  }

  function resetCache() {
    _cache = {};
  }

  function retrieveCachedUrl(upload, siteSettings, dataAttribute, opts, callback) {
    var cachedUpload = lookupCachedUploadUrl(upload.getAttribute("data-".concat(dataAttribute)));
    var url = getAttributeBasedUrl(dataAttribute, cachedUpload, siteSettings);

    if (url) {
      upload.removeAttribute("data-".concat(dataAttribute));

      if (url !== MISSING) {
        callback(url);
      } else if (opts && opts.removeMissing) {
        var style = getComputedStyle(document.body);
        var canvas = document.createElement("canvas");
        canvas.width = upload.width;
        canvas.height = upload.height;
        var context = canvas.getContext("2d"); // Draw background

        context.fillStyle = getComputedStyle(document.body).backgroundColor;
        context.strokeRect(0, 0, canvas.width, canvas.height); // Draw border

        context.lineWidth = 2;
        context.strokeStyle = getComputedStyle(document.body).color;
        context.strokeRect(0, 0, canvas.width, canvas.height);
        var fontSize = 25;

        var text = _I18n.default.t("image_removed"); // Fill text size to fit the canvas


        var textSize;

        do {
          --fontSize;
          context.font = "".concat(fontSize, "px ").concat(style.fontFamily);
          textSize = context.measureText(text);
        } while (textSize.width > canvas.width);

        context.fillStyle = getComputedStyle(document.body).color;
        context.fillText(text, (canvas.width - textSize.width) / 2, (canvas.height + fontSize) / 2);
        upload.parentNode.replaceChild(canvas, upload);
      }
    }
  }

  function getAttributeBasedUrl(dataAttribute, cachedUpload, siteSettings) {
    if (!cachedUpload.url) {
      return;
    } // non-attachments always use the full URL


    if (dataAttribute !== "orig-href") {
      return cachedUpload.url;
    } // attachments should use the full /secure-media-uploads/ URL
    // in this case for permission checks


    if (siteSettings.secure_media && cachedUpload.url.indexOf("secure-media-uploads") > -1) {
      return cachedUpload.url;
    }

    return cachedUpload.short_path;
  }

  function _loadCachedShortUrls(uploadElements, siteSettings, opts) {
    uploadElements.forEach(function (upload) {
      switch (upload.tagName) {
        case "A":
          retrieveCachedUrl(upload, siteSettings, "orig-href", opts, function (url) {
            upload.href = url;
          });
          break;

        case "IMG":
          retrieveCachedUrl(upload, siteSettings, "orig-src", opts, function (url) {
            upload.src = url;
          });
          break;

        case "SOURCE":
          // video/audio tag > source tag
          retrieveCachedUrl(upload, siteSettings, "orig-src", opts, function (url) {
            if (url.startsWith("//".concat(window.location.host))) {
              var hostRegex = new RegExp("//" + window.location.host, "g");
              url = url.replace(hostRegex, "");
            }

            upload.src = url; // set the url and text for the <a> tag within the <video/audio> tag

            var link = upload.parentElement.querySelector("a");

            if (link) {
              link.href = url;
              link.textContent = url;
            }
          });
          break;
      }
    });
  }

  function _loadShortUrls(uploads, ajax, siteSettings, opts) {
    var urls = _toConsumableArray(uploads).map(function (upload) {
      return upload.getAttribute("data-orig-src") || upload.getAttribute("data-orig-href");
    });

    return lookupUncachedUploadUrls(urls, ajax).then(function () {
      return _loadCachedShortUrls(uploads, siteSettings, opts);
    });
  }

  function resolveAllShortUrls(ajax, siteSettings, scope, opts) {
    var attributes = "img[data-orig-src], a[data-orig-href], source[data-orig-src]";
    var shortUploadElements = scope.querySelectorAll(attributes);

    if (shortUploadElements.length > 0) {
      _loadCachedShortUrls(shortUploadElements, siteSettings, opts);

      shortUploadElements = scope.querySelectorAll(attributes);

      if (shortUploadElements.length > 0) {
        // this is carefully batched so we can do a leading debounce (trigger right away)
        return (0, _debounce.default)(null, _loadShortUrls, shortUploadElements, ajax, siteSettings, opts, 450, true);
      }
    }
  }
});















