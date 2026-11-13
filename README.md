# Configuration de GP F1 communauté

La page de partage est `communaute.html`. Les visiteurs peuvent envoyer une capture avec leur nom et un message ; les photos restent privées jusqu'à leur approbation par l'administrateur.

## Mise en ligne et partage

Le site actuel est un site statique. Publiez le contenu du dépôt sur un hébergeur statique (par exemple GitHub Pages ou Netlify), puis partagez l'URL de `communaute.html` avec vos collègues. Le dépôt GitHub seul n'est pas une adresse de site publique. Le dépôt étant privé, assurez-vous que votre hébergeur peut le déployer.

## Activer les photos et l'accès administrateur

1. Créez un projet Supabase sur supabase.com.
2. Dans **SQL Editor**, exécutez le fichier `supabase-setup.sql`.
3. Dans les paramètres API du projet Supabase, copiez l'URL du projet et la clé publique **anon/publishable** (jamais la clé `service_role`). Remplacez les deux valeurs dans `supabase-config.js`.
4. Dans Supabase **Authentication > Users**, créez votre utilisateur administrateur avec votre adresse e-mail et un mot de passe solide.
5. Copiez l'UUID de cet utilisateur. Dans le SQL Editor, exécutez `insert into public.gp_admins (user_id) values ('UUID-COPIÉ');` en remplaçant la valeur par son UUID réel.
6. Redéployez le site et ouvrez `communaute.html`. Dans **Accès administrateur**, connectez-vous. Vous pourrez consulter les demandes, ajouter/modifier leur légende, publier ou supprimer les photos.

L'administrateur approuve chaque envoi avant qu'il apparaisse dans la galerie. Les visiteurs peuvent envoyer uniquement des images JPG, PNG, WEBP ou GIF de 8 Mo maximum. Les photos sont stockées dans un bucket privé ; seules les photos approuvées sont visibles dans la galerie.

**Important :** ne mettez jamais une clé `service_role`, un mot de passe ou un code admin dans un fichier servi au public. `supabase-config.js` ne contient que l'URL et la clé publique destinée au navigateur ; la sécurité repose sur les politiques RLS et Storage du script SQL.
