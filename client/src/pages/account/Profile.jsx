import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, KeyRound, Loader2, Save, Trash2 } from 'lucide-react';
import Seo from '../../components/Seo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Checkbox, Modal } from '../../components/ui';
import api from '../../lib/api';

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    emailOptIn: !!user?.emailOptIn,
  });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/account/profile', form);
      await refresh();
      toast.success('Informations mises à jour.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setChanging(true);
    try {
      await api.post('/account/password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Mot de passe modifié.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChanging(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer.');
      return;
    }
    setDeleting(true);
    try {
      await api.del('/account', { confirm: true });
      await logout();
      toast.info('Votre compte a été supprimé. Merci de votre confiance.');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Seo title="Mes informations | EdyEco" robots="noindex, nofollow" />
      <div className="space-y-6">
        <form onSubmit={saveProfile} className="rounded-2xl border border-forest-900/8 bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Informations personnelles</h2>
          <p className="mt-0.5 text-xs text-ink/50">Ces informations sont utilisées pour vos commandes et nos échanges.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="profile-first">Prénom</label>
              <input id="profile-first" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="profile-last">Nom</label>
              <input id="profile-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="profile-email">Email</label>
              <input id="profile-email" value={user?.email || ''} disabled className="field bg-forest-50/60 text-ink/50" />
              <p className="mt-1 text-[10px] text-ink/40">Contactez-nous pour changer d’adresse email.</p>
            </div>
            <div>
              <label className="label" htmlFor="profile-phone">Téléphone</label>
              <input id="profile-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field" />
            </div>
          </div>
          <div className="mt-4">
            <Checkbox label="Je reçois les conseils et offres EdyEco" checked={form.emailOptIn} onChange={(v) => setForm({ ...form, emailOptIn: v })} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
          </button>
        </form>

        <form onSubmit={changePassword} className="rounded-2xl border border-forest-900/8 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="h-4 w-4 text-forest-700" /> Mot de passe</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="current-pass">Mot de passe actuel</label>
              <input id="current-pass" type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="new-pass">Nouveau mot de passe</label>
              <input id="new-pass" type="password" required minLength={8} autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="confirm-pass">Confirmation</label>
              <input id="confirm-pass" type="password" required autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="field" />
            </div>
          </div>
          <button type="submit" disabled={changing} className="btn-outline mt-5">
            {changing ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Modifier le mot de passe
          </button>
        </form>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" /> Supprimer mon compte</h2>
          <p className="mt-1 text-xs text-rose-800/70">Cette action est définitive. Vos commandes seront anonymisées pour respecter nos obligations comptables.</p>
          <button type="button" onClick={() => setDeleteOpen(true)} className="btn mt-4 border border-rose-300 bg-white text-sm font-semibold text-rose-700 hover:bg-rose-100">
            <Trash2 className="h-4 w-4" /> Supprimer mon compte
          </button>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Supprimer définitivement mon compte" size="sm">
        <p className="text-sm text-ink/70">
          Vos données personnelles seront effacées. Vos commandes passées seront conservées de façon anonyme pour nos obligations légales.
        </p>
        <label className="label mt-4" htmlFor="delete-confirm">Tapez SUPPRIMER pour confirmer</label>
        <input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="field" placeholder="SUPPRIMER" />
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setDeleteOpen(false)} className="btn-outline flex-1">Annuler</button>
          <button type="button" onClick={deleteAccount} disabled={deleting || confirmText !== 'SUPPRIMER'} className="btn flex-1 bg-rose-600 text-white hover:bg-rose-700">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer
          </button>
        </div>
      </Modal>
    </>
  );
}
