/*
	jQuery.trans - Copyright 2014 jsguy
	jQuery transitions support - falls back to jQuery.animate for non-supported browsers
	MIT Licensed.
*/
(function ($) {
	var div = document.createElement('div'),
	cap = function(str){
		return str.charAt(0).toUpperCase() + str.substr(1);
	},
		
	prefixes = ['Moz', 'Webkit', 'Khtml', 'O', 'ms'],

	//	vendor prefix, ie: transitionDuration becomes MozTransitionDuration
	vendorProp = function (prop) {
		var vp;
		//	Handle unprefixed (eg: FF16+)
		if (prop in div.style) {
			return prop;
		}

		for (var i = 0; i < prefixes.length; i += 1) {
			vp = prefixes[i] + cap(prop);
			if (vp in div.style) {
				return vp;
			}
		}
		//	Can't find it - return original property.
		return prop;
	},

	//	See if we can use native transitions
	supportsTransitions = function() {
		var b = document.body || document.documentElement,
			s = b.style,
			p = 'transition';

		if (typeof s[p] == 'string') { return true; }

		// Tests for vendor specific prop
		p = p.charAt(0).toUpperCase() + p.substr(1);

		for (var i=0; i<prefixes.length; i++) {
			if (typeof s[prefixes[i] + p] == 'string') { return true; }
		}

		return false;
	},

	//  Get the properties we're after
	getProps = function (obj) {
		var i, props = {};
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				props[vendorProp(i)] = obj[i];
			}
		}
		return props;
	}, 

	//	Converts CSS transition times to MS
	getTimeinMS = function(str) {
		var result = 0, tmp;
		str += "";
		str = str.toLowerCase();
		if(str.indexOf("ms") !== -1) {
			tmp = str.split("ms");
			result = Number(tmp[0]);
		} else if(str.indexOf("s") !== -1) {
			//	s
			tmp = str.split("s");
			result = Number(tmp[0]) * 1000;
		} else {
			result = Number(str);
		}

		return Math.round(result);
	},

	//	See if we can trannsition
	canTrans = supportsTransitions();


	//	Main method
	$.fn.trans = function (args) {
		var setProps = ['TransitionProperty', 'TransitionTiming', 'TransitionDelay', 'TransitionDuration', 'TransitionEnd'],
			transformProps = ['rotate', 'scale', 'skew', 'translate'],
			props = {
				//	ease, linear, ease-in, ease-out, ease-in-out, cubic-bezier(n,n,n,n) initial, inherit
				TransitionTiming: "ease",
				TransitionDuration: "0.5s",
				TransitionProperty: "all"
			}, p, i, tmp, tmp2, found,
			self = this,
			$s = $(self),
			queue = $s.data('queue') || [], 
			timeQueue = $s.data('timeQueue') || [],
			propQueue = $s.data('propQueue') || [],
			inProgress = $s.data('inProgress') || false,

			process = function () {
				var tmpProps;

				inProgress = false;
				$s.data('inProgress', inProgress);

				//	Remove guarding timeout
				if(timeQueue.length > 0) {
					clearTimeout(timeQueue[timeQueue.length -1]);
					timeQueue.shift();
					$s.data('timeQueue', timeQueue);
				}

				//	Remove properties
				$.each(setProps, function(idx,prop){
					$(self).css(prop, '');
				});

				//	Add back old properties
				tmpProps = propQueue.shift();
				$s.data('propQueue', propQueue);

				if(!$.isEmptyObject(tmpProps)) {
					$(self).css(tmpProps);
				}

				//	Apply next transition queued
				if(queue.length > 0) {
					$(self).trans.apply(self, queue.shift());
					$s.data('queue', queue);
				} else {
					//	Remove all properties
					$s.removeData('queue');
					$s.removeData('timeQueue');
					$s.removeData('propQueue');
					$s.removeData('inProgress');
				}
			};

		//	Ensure we initialise the queues
		$s.data('queue', queue);
		$s.data('timeQueue', timeQueue);
		$s.data('propQueue', propQueue);
		$s.data('inProgress', inProgress);

		//	Set any transition properties 
		for(p in args) { if(args.hasOwnProperty(p)) {
			tmp = 'Transition' + cap(p);
			tmp2 = p.toLowerCase();
			found = false;

			for(i = 0; i < setProps.length; i += 1) {
				if(tmp == setProps[i]) {
					props[setProps[i]] = args[p];
					found = true;
					break;
				}
			}

			for(i = 0; i < transformProps.length; i += 1) {
				if(tmp2 == transformProps[i]) {
					props[vendorProp("transform")] = props[vendorProp("transform")] || "";
					props[vendorProp("transform")] += " " +p + "(" + args[p] + ")";
					found = true;
					break;
				}
			}

			if(!found) {
				props[p] = args[p];
			}
		}}


		if(inProgress) {
			queue.push(arguments);
			$s.data('queue', queue);
		} else {
			inProgress = true;
			$s.data('inProgress', inProgress);

			var doTrans = function () {
				var time = getTimeinMS(props.TransitionDuration) || 0;

				//	Add a timeout to process the next queued transition
				//	Note: We do not use the native browser callbacks as they won't run if there is nothing to animate.
				if(!isNaN(time)) {
					//	Push a function onto the time queue
					timeQueue.push(setTimeout(function(){
						process();
					}, time));
					$s.data('timeQueue', timeQueue);
				}

				//	Save old properties that do not have anything to do with trans
				var oldProps = {};
				$.each(setProps, function(idx,prop){
					var theProp = $(self).css(prop);
					if(theProp) {
						oldProps[prop] = theProp;
					}
				});

				propQueue.push(oldProps);
				$s.data('propQueue', propQueue);

				if(canTrans) {
					$(self).css(props);
				} else {
					$(self).animate(props, getTimeinMS(props.TransitionDuration));
				}
			};

			//  RAF/setTimeout fixes various issues with stuttering animations
			if(typeof requestAnimationFrame !== 'undefined'){
				requestAnimationFrame(doTrans);
			} else {
				setTimeout(doTrans,0);
			}
		}

		return this;
	};
}(jQuery));
