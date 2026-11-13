/* Configure supabase-config.js, then create the tables and storage bucket with supabase-setup.sql. */
const db = window.supabase;
const configReady = typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('REMPLACEZ') && !SUPABASE_ANON_KEY.includes('REMPLACEZ');
const client = configReady && db ? db.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const bucket = 'gp-screenshots';
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const uploadForm = document.querySelector('#upload-form');
const uploadStatus = document.querySelector('#upload-status');
const gallery = document.querySelector('#gallery');
const loginForm = document.querySelector('#login-form');
const adminStatus = document.querySelector('#admin-status');
const adminQueue = document.querySelector('#admin-queue');
const logoutButton = document.querySelector('#logout-button');
const showStatus = (node, text, kind = '') => { node.textContent = text; node.className = `status ${kind}`; };

function checkConfiguration() {
  if (!client) {
    showStatus(uploadStatus, 'La galerie doit être configurée par l’administrateur avant de recevoir des photos.', 'error');
    showStatus(gallery.querySelector('.status'), 'La galerie sera disponible après la configuration du site.');
    document.querySelector('#admin').classList.add('not-configured');
  }
}

async function signedPhoto(path) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function loadGallery() {
  if (!client) return;
  const { data, error } = await client.from('gp_photos').select('id,name,note,caption,storage_path,created_at').eq('published', true).order('created_at', { ascending: false });
  if (error) { showStatus(gallery.querySelector('.status') || gallery, 'Impossible de charger la galerie pour le moment.', 'error'); return; }
  if (!data.length) { gallery.innerHTML = '<p class="status">Pas encore de photo publiée — envoyez la première !</p>'; return; }
  gallery.innerHTML = '';
  for (const photo of data) {
    try {
      const url = await signedPhoto(photo.storage_path);
      const card = document.createElement('article'); card.className = 'photo-card';
      const image = document.createElement('img'); image.src = url; image.alt = `Photo partagée par ${photo.name}`; image.loading = 'lazy';
      const caption = document.createElement('div'); caption.className = 'photo-caption';
      const name = document.createElement('strong'); name.textContent = photo.name;
      caption.append(name);
      if (photo.caption || photo.note) { const note = document.createElement('p'); note.textContent = photo.caption || photo.note; caption.append(note); }
      card.append(image, caption); gallery.append(card);
    } catch (e) { console.error('Photo indisponible', e); }
  }
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client) return checkConfiguration();
  const file = document.querySelector('#photo-file').files[0];
  const name = document.querySelector('#sender-name').value.trim();
  const note = document.querySelector('#sender-note').value.trim();
  if (!file || !name) return;
  if (!allowedTypes.includes(file.type)) return showStatus(uploadStatus, 'Choisissez une image JPG, PNG, WEBP ou GIF.', 'error');
  if (file.size > 8 * 1024 * 1024) return showStatus(uploadStatus, 'La photo dépasse la limite de 8 Mo.', 'error');
  const submit = uploadForm.querySelector('button[type="submit"]'); submit.disabled = true;
  showStatus(uploadStatus, 'Envoi de la photo…');
  const path = `${crypto.randomUUID()}.${file.type.split('/')[1].replace('jpeg', 'jpg')}`;
  const { error: storageError } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (storageError) { showStatus(uploadStatus, `Échec de l’envoi : ${storageError.message}`, 'error'); submit.disabled = false; return; }
  const { error } = await client.from('gp_photos').insert({ name, note, storage_path: path, published: false });
  if (error) {
    await client.storage.from(bucket).remove([path]);
    showStatus(uploadStatus, `La photo n’a pas pu être enregistrée : ${error.message}`, 'error');
  } else {
    uploadForm.reset(); showStatus(uploadStatus, 'Merci ! Votre photo a été envoyée et attend la validation de l’administrateur.', 'success');
  }
  submit.disabled = false;
});

async function isAdmin() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  const { data, error } = await client.from('gp_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !error && Boolean(data);
}

async function loadQueue() {
  if (!client || !(await isAdmin())) { adminQueue.hidden = true; logoutButton.hidden = true; return; }
  logoutButton.hidden = false;
  const { data, error } = await client.from('gp_photos').select('id,name,note,caption,storage_path,published,created_at').order('created_at', { ascending: false });
  if (error) { showStatus(adminStatus, 'Impossible de charger les photos. Vérifiez que votre compte est autorisé administrateur.', 'error'); return; }
  adminQueue.hidden = false; adminQueue.innerHTML = '';
  if (!data.length) { adminQueue.innerHTML = '<p class="status">Aucune photo reçue pour le moment.</p>'; return; }
  for (const photo of data) {
    const card = document.createElement('article'); card.className = 'queue-card';
    try { const image = document.createElement('img'); image.src = await signedPhoto(photo.storage_path); image.alt = ''; card.append(image); } catch {}
    const content = document.createElement('div'); content.className = 'queue-content';
    const title = document.createElement('strong'); title.textContent = `${photo.name} · ${photo.published ? 'PUBLIÉE' : 'À VALIDER'}`;
    const note = document.createElement('p'); note.textContent = photo.note || 'Aucun message ajouté.';
    const caption = document.createElement('input'); caption.className = 'caption-input'; caption.maxLength = 300; caption.placeholder = 'Ajouter/modifier la légende visible'; caption.value = photo.caption || '';
    const actions = document.createElement('div'); actions.className = 'queue-actions';
    const publish = document.createElement('button'); publish.textContent = photo.published ? 'ENREGISTRER' : 'PUBLIER';
    publish.addEventListener('click', async () => {
      publish.disabled = true;
      const { error: saveError } = await client.from('gp_photos').update({ caption: caption.value.trim(), published: true }).eq('id', photo.id);
      if (saveError) showStatus(adminStatus, `Erreur : ${saveError.message}`, 'error'); else { showStatus(adminStatus, 'Photo publiée / mise à jour.', 'success'); await loadQueue(); await loadGallery(); }
      publish.disabled = false;
    });
    const remove = document.createElement('button'); remove.className = 'danger'; remove.textContent = 'SUPPRIMER';
    remove.addEventListener('click', async () => {
      if (!confirm('Supprimer définitivement cette photo ?')) return;
      const { error: removeError } = await client.storage.from(bucket).remove([photo.storage_path]);
      if (removeError) { showStatus(adminStatus, `Erreur de suppression : ${removeError.message}`, 'error'); return; }
      const { error: rowError } = await client.from('gp_photos').delete().eq('id', photo.id);
      if (rowError) { showStatus(adminStatus, `Erreur : ${rowError.message}`, 'error'); return; }
      showStatus(adminStatus, 'Photo supprimée.', 'success'); await loadQueue(); await loadGallery();
    });
    actions.append(publish, remove); content.append(title, note, caption, actions); card.append(content); adminQueue.append(card);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!client) return checkConfiguration();
  const button = loginForm.querySelector('button[type="submit"]'); button.disabled = true;
  const { error } = await client.auth.signInWithPassword({ email: document.querySelector('#admin-email').value, password: document.querySelector('#admin-password').value });
  if (error) showStatus(adminStatus, 'Connexion refusée. Vérifiez vos identifiants.', 'error');
  else if (!(await isAdmin())) { await client.auth.signOut(); showStatus(adminStatus, 'Ce compte est connecté mais ne figure pas dans la liste des administrateurs.', 'error'); }
  else { showStatus(adminStatus, 'Connexion réussie.', 'success'); await loadQueue(); }
  button.disabled = false;
});
logoutButton.addEventListener('click', async () => { await client?.auth.signOut(); adminQueue.hidden = true; logoutButton.hidden = true; showStatus(adminStatus, 'Vous êtes déconnecté.'); });

if (client) { loadGallery(); client.auth.onAuthStateChange(() => { setTimeout(loadQueue, 0); }); loadQueue(); } else checkConfiguration();
