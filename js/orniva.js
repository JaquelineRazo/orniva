// ORNIVA — hero video (NOVI builds a website) and reveal-on-scroll.
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

	// The video holds its last frame when it ends; then offer a replay.
	video.addEventListener('ended', function () {
		video.setAttribute('poster', endPoster);
		replay.hidden = false;
	});

	replay.addEventListener('click', function () {
		replay.hidden = true;
		if (!video.src) { video.src = src; }
		video.currentTime = 0;
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
