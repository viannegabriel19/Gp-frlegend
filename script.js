const standings = {
  pilotes: [
    ['01','L. Norris','McLaren','423'],['02','M. Verstappen','Red Bull Racing','389'],['03','C. Leclerc','Ferrari','366'],['04','O. Piastri','McLaren','342'],['05','G. Russell','Mercedes','301']
  ],
  constructeurs: [
    ['01','McLaren','McLaren','765'],['02','Ferrari','Ferrari','682'],['03','Red Bull Racing','Red Bull','641'],['04','Mercedes','Mercedes','514'],['05','Aston Martin','Aston Martin','227']
  ]
};

const tableBody = document.querySelector('#standings-body');
const tableLabel = document.querySelector('#table-label');
function renderStandings(type = 'pilotes') {
  if (!tableBody) return;
  tableLabel.textContent = type === 'pilotes' ? 'PILOTE' : 'ÉQUIPE';
  tableBody.innerHTML = standings[type].map(([pos, name, team, points]) => `
    <tr><td>${pos}</td><td>${name}</td><td class="team-tag">${team}</td><td>${points}</td></tr>
  `).join('');
}
renderStandings();

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    renderStandings(tab.dataset.table);
  });
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

// Countdown target: the advertised Abu Dhabi finale date. Update the date when the
// official event schedule is confirmed.
const raceDate = new Date('2026-12-06T13:00:00+04:00').getTime();
function updateCountdown() {
  const remaining = raceDate - Date.now();
  const values = remaining > 0 ? {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor((remaining % 86400000) / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000)
  } : { days: 0, hours: 0, minutes: 0 };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value).padStart(2, '0');
  });
}
updateCountdown();
setInterval(updateCountdown, 60000);

document.querySelector('#newsletter-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.querySelector('#form-message');
  message.textContent = 'Merci ! Votre inscription est enregistrée pour cette démonstration.';
  message.classList.add('success');
  event.currentTarget.reset();
});
