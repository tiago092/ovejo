/* Official SoundCloud player for the requested recording. The local score is an offline fallback. */
'use strict';
window.RosaTrackAudio = class RosaTrackAudio {
  constructor(context) {
    this.local = new RosaMusic(context);
    this.widget = null;
    this.ready = false;
    this.active = false;
    RosaTrackAudio.instance = this;
    this.connect();
  }
  static connect() { RosaTrackAudio.instance?.connect(); }
  connect() {
    if (this.widget || !window.SC?.Widget) return;
    const frame = document.getElementById('trackPlayer');
    if (!frame) return;
    this.widget = window.SC.Widget(frame);
    this.widget.bind(window.SC.Widget.Events.READY, () => {
      this.ready = true;
      if (this.active) this.widget.play();
    });
    this.widget.bind(window.SC.Widget.Events.PLAY, () => {
      if (!this.active) { this.widget.pause(); return; }
      this.local.stop();
      document.getElementById('trackStatus').textContent = 'Suena Magalenha';
    });
    this.widget.bind(window.SC.Widget.Events.FINISH, () => {
      if (this.active) { this.widget.seekTo(0); this.widget.play(); }
    });
    this.widget.bind(window.SC.Widget.Events.ERROR, () => {
      if (this.active) this.local.play();
      document.getElementById('trackStatus').textContent = 'Pista local';
    });
  }
  play() {
    this.active = true;
    this.local.play();
    this.connect();
    if (this.ready) this.widget.play();
    document.getElementById('trackStatus').textContent = 'Magalenha · tocá ▶ si el navegador bloquea el inicio';
  }
  stop() {
    this.active = false;
    this.local.stop();
    if (this.ready) this.widget.pause();
    document.getElementById('trackStatus').textContent = 'En pausa';
  }
};
