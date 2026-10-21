// ORNIVA — hero video (NOVI builds a website, looping) and reveal-on-scroll.
(function () {
	var video = document.querySelector('[data-novi-hero]');
	if (!video) { return; }
	var replay = document.querySelector('[data-replay]');
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var saveData = navigator.connection && navigator.connection.saveData;
	var endPoster = video.getAttribute('data-poster-end');

	// Reduced motion or data saver: show the finished scene, no video.
	if (reduced || saveData) {
		video.setAttribute('poster', endPoster);
		return;
	}

	// Pick the lighter file on small screens; load after the page content.
	var src = window.matchMedia('(max-width: 767px)').matches
		? video.getAttribute('data-src-mobile')
		: video.getAttribute('data-src-desktop');

	function start() {
		video.src = src;
		var play = video.play();
		if (play && play.catch) {
			// Autoplay blocked: keep the finished scene and offer a play button.
			play.catch(function () {
				video.setAttribute('poster', endPoster);
				replay.hidden = false;
			});
		}
	}

	// The hero loops. The button only appears if the browser blocks
	// autoplay, and starts the loop on tap.
	replay.addEventListener('click', function () {
		replay.hidden = true;
		if (!video.src) { video.src = src; }
		video.play();
	});

	if (document.readyState === 'complete') { start(); }
	else { window.addEventListener('load', start); }
})();

(function () {
	var items = document.querySelectorAll('.reveal');
	if (!('IntersectionObserver' in window)) {
		items.forEach(function (el) { el.classList.add('is-in'); });
		return;
	}
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
		});
	}, { rootMargin: '0px 0px -10% 0px' });
	items.forEach(function (el) { io.observe(el); });
})();

// Small looping videos (NOVI idle) play only while on screen.
(function () {
	var vids = document.querySelectorAll('video[data-autoplay-inview]');
	if (!vids.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { return; }
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			var v = entry.target;
			if (entry.isIntersecting) { v.preload = 'auto'; var p = v.play(); if (p && p.catch) { p.catch(function () {}); } }
			else { v.pause(); }
		});
	}, { threshold: 0.35 });
	vids.forEach(function (v) { io.observe(v); });
})();

// Data diagram: contact counter counts up once when it appears (illustrative).
(function () {
	var el = document.querySelector('[data-count]');
	if (!el || !('IntersectionObserver' in window)) { if (el) { el.textContent = Number(el.getAttribute('data-count')).toLocaleString('en-US'); } return; }
	var target = Number(el.getAttribute('data-count'));
	var io = new IntersectionObserver(function (entries) {
		if (!entries[0].isIntersecting) { return; }
		io.disconnect();
		var start = performance.now();
		(function tick(now) {
			var t = Math.min((now - start) / 1400, 1);
			el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString('en-US');
			if (t < 1) { requestAnimationFrame(tick); }
		})(start);
	});
	io.observe(el);
})();

// Contact form: package preset, first-touch source, background submit.
(function () {
	var form = document.getElementById('contact-form');
	if (!form) { return; }
	var select = form.querySelector('select[name="package"]');
	var status = form.querySelector('.form-status');
	var button = form.querySelector('button[type="submit"]');

	document.querySelectorAll('[data-package]').forEach(function (link) {
		link.addEventListener('click', function () { select.value = link.getAttribute('data-package'); });
	});

	var params = new URLSearchParams(location.search);
	var source = params.get('utm_source') || params.get('ref');
	try {
		if (source && !sessionStorage.getItem('orniva_source')) { sessionStorage.setItem('orniva_source', source); }
		source = sessionStorage.getItem('orniva_source') || source;
	} catch (e) {}
	form.querySelector('input[name="source"]').value = source || (document.referrer && document.referrer.indexOf(location.host) === -1 ? 'referral' : 'direct');

	function fail(message) {
		form.classList.remove('is-sending');
		button.disabled = false;
		button.textContent = 'Send message';
		status.classList.add('is-error');
		status.innerHTML = message;
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var missing = false;
		form.querySelectorAll('[required]').forEach(function (field) {
			var bad = !field.value.trim() || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()));
			field.closest('.field').classList.toggle('is-invalid', bad);
			if (bad) { missing = true; }
		});
		if (missing) { fail('Please add your name, a valid work email and a short message.'); return; }

		var data = {};
		new FormData(form).forEach(function (value, key) { data[key] = value; });
		form.classList.add('is-sending');
		button.disabled = true;
		button.textContent = 'Sending…';
		status.classList.remove('is-error');
		status.textContent = '';

		var controller = window.AbortController ? new AbortController() : null;
		var timer = setTimeout(function () { if (controller) { controller.abort(); } }, 10000);
		fetch(form.action, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify(data),
			signal: controller ? controller.signal : undefined
		}).then(function (r) { return r.json(); }).then(function (res) {
			clearTimeout(timer);
			if (!res || res.success !== true) { throw new Error(res && res.error); }
			if (window.umami && typeof window.umami.track === 'function') {
				window.umami.track('form-submit', { brand: 'orniva', package: data.package, source: data.source });
			}
			form.classList.remove('is-sending');
			form.classList.add('is-sent');
			status.textContent = 'Thank you! We read every message and usually reply within two business days.';
		}).catch(function () {
			clearTimeout(timer);
			fail('We couldn’t send your message. Please email <a href="mailto:orniva@razzobusiness.com">orniva@razzobusiness.com</a>.');
		});
	});
})();
