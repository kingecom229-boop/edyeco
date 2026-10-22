import { useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Seo from '../components/Seo';
import PageHero from '../components/layout/PageHero';
import { useStore } from '../context/StoreContext';

const LAST_UPDATE = 'Octobre 2026';

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-xl font-semibold text-forest-950 sm:text-2xl">{title}</h2>
      <div className="prose-edyeco mt-2">{children}</div>
    </section>
  );
}

export default function Legal() {
  const { page } = useParams();
  const { store } = useStore();

  const pages = {
    'mentions-legales': {
      title: 'Mentions légales',
      description: 'Mentions légales et informations éditeur du site EdyEco.',
      sections: (
        <>
          <Section title="Éditeur du site">
            <p>
              Le site edyeco.fr est édité par <strong>{store.legalName || 'EdyEco SAS'}</strong>, société par actions simplifiée,
              dont le siège social est situé {store.address}.
            </p>
            <ul>
              <li>Email : {store.email}</li>
              <li>Téléphone : {store.phone}</li>
              <li>Numéro SIRET : {store.siret}</li>
              <li>Numéro de TVA intracommunautaire : {store.vat}</li>
              <li>Directeur de la publication : la direction d’EdyEco</li>
            </ul>
          </Section>
          <Section title="Hébergement">
            <p>
              Le site est hébergé par un prestataire d’hébergement professionnel situé dans l’Union européenne.
              Les coordonnées complètes de l’hébergeur sont disponibles sur demande à {store.email}.
            </p>
          </Section>
          <Section title="Propriété intellectuelle">
            <p>
              L’ensemble du contenu du site (textes, photographies, illustrations, logos, marques, éléments graphiques)
              est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification
              ou adaptation, totale ou partielle, sans autorisation écrite préalable est interdite.
            </p>
          </Section>
          <Section title="Responsabilité">
            <p>
              EdyEco met tout en œuvre pour assurer l’exactitude des informations publiées. Les photographies des produits
              sont illustratives ; le bois étant une matière naturelle, des variations de teinte et de forme sont normales.
              EdyEco ne saurait être responsable des dommages résultant d’une utilisation non conforme de ses produits.
            </p>
          </Section>
          <Section title="Médiation et litiges">
            <p>
              En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le consommateur peut recourir
              gratuitement à un médiateur de la consommation. Les tribunaux compétents sont ceux du ressort du siège d’EdyEco.
            </p>
          </Section>
        </>
      ),
    },
    cgv: {
      title: 'Conditions générales de vente',
      description: 'Conditions générales de vente EdyEco : commande, livraison, paiement, rétractation et garanties.',
      sections: (
        <>
          <Section title="1. Objet">
            <p>
              Les présentes conditions générales régissent les ventes conclues sur le site edyeco.fr entre EdyEco et tout
              consommateur ou professionnel. Toute commande implique l’acceptation sans réserve des présentes conditions.
            </p>
          </Section>
          <Section title="2. Produits">
            <p>
              Les produits proposés sont le bois de chauffage, les granulés de bois, les bûches compressées et les accessoires.
              Les caractéristiques essentielles sont décrites sur chaque fiche produit. Le bois étant un produit naturel,
              des variations de calibre, de teinte et de forme sont inhérentes au matériau.
            </p>
          </Section>
          <Section title="3. Prix et commande">
            <p>
              Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison précisés avant validation.
              EdyEco se réserve le droit de modifier ses prix à tout moment, le prix applicable étant celui affiché au moment
              de la commande. La commande est validée après acceptation des présentes conditions et confirmation du paiement.
            </p>
          </Section>
          <Section id="paiement" title="4. Paiement">
            <p>
              Le paiement s’effectue en ligne par carte bancaire. Le paiement en 3 fois sans frais est proposé à partir de 300 €
              d’achat, sous réserve d’éligibilité. Les données bancaires ne sont jamais stockées par EdyEco : elles sont traitées
              par un prestataire de paiement certifié PCI-DSS.
            </p>
          </Section>
          <Section title="5. Livraison">
            <p>
              Livraison en France métropolitaine. Les délais sont indiqués à titre indicatif : 5 à 8 jours ouvrés pour une livraison
              classique, environ deux semaines pour une livraison confort, sous 48 h pour un retrait entrepôt sur rendez-vous.
              Le client doit vérifier l’accessibilité de son adresse et signaler toute contrainte susceptible d’empêcher la livraison.
              À défaut, les frais de présentation ou de retour pourront être facturés.
            </p>
          </Section>
          <Section title="6. Droit de rétractation">
            <p>
              Conformément à l’article L221-18 du Code de la consommation, le consommateur dispose de 14 jours pour exercer son droit
              de rétractation à compter de la réception de sa commande. Les produits doivent être retournés non ouverts, dans leur
              conditionnement d’origine, les frais de retour étant à la charge du client. Ce droit ne s’applique pas aux produits
              personnalisés ou entamés.
            </p>
          </Section>
          <Section title="7. Garanties">
            <p>
              Tous nos produits bénéficient de la garantie légale de conformité (2 ans) et de la garantie contre les vices cachés.
              En cas de bois non conforme (humidité supérieure à 20 %, essence différente de celle commandée, quantité manquante),
              EdyEco s’engage à procéder à un échange ou un remboursement dans un délai de 7 jours après constat.
            </p>
          </Section>
          <Section title="8. Responsabilité">
            <p>
              EdyEco ne saurait être tenue responsable de l’usage qui est fait du bois livré, notamment en cas de non-respect des
              consignes d’entretien de l’appareil de chauffage (ramonage, ventilation) ou de combustion de bois humide.
            </p>
          </Section>
          <Section title="9. Données personnelles">
            <p>
              Le traitement des données est décrit dans notre politique de confidentialité. Le client dispose d’un droit d’accès,
              de rectification, d’effacement et d’opposition en écrivant à {store.email}.
            </p>
          </Section>
          <Section title="10. Litiges">
            <p>
              Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant
              toute action judiciaire. Le consommateur peut saisir gratuitement le médiateur de la consommation.
            </p>
          </Section>
        </>
      ),
    },
    confidentialite: {
      title: 'Politique de confidentialité',
      description: 'Comment EdyEco collecte et protège vos données personnelles, conformément au RGPD.',
      sections: (
        <>
          <Section title="Responsable du traitement">
            <p>
              Le responsable du traitement est {store.legalName || 'EdyEco SAS'}, {store.address}. Pour toute question relative à vos
              données, écrivez à {store.email}.
            </p>
          </Section>
          <Section title="Données collectées">
            <ul>
              <li>Identification et contact : nom, prénom, email, téléphone.</li>
              <li>Adresses de livraison et de facturation.</li>
              <li>Historique de commandes et de paniers.</li>
              <li>Données de navigation anonymisées (pages vues, événements) mesurées en première partie.</li>
              <li>Si vous y consentez : votre adresse email pour la newsletter.</li>
            </ul>
          </Section>
          <Section title="Finalités et bases légales">
            <ul>
              <li>Gestion des commandes et livraisons : exécution du contrat.</li>
              <li>Service client et réclamations : intérêt légitime.</li>
              <li>Newsletter : consentement, révocable à tout moment.</li>
              <li>Statistiques de fréquentation : intérêt légitime, données agrégées.</li>
              <li>Obligations comptables : obligation légale.</li>
            </ul>
          </Section>
          <Section title="Durées de conservation">
            <p>
              Les données de commande sont conservées 10 ans pour les obligations comptables. Les données de contact client sont
              conservées 3 ans après le dernier achat. Les données de newsletter sont conservées jusqu’à désinscription. Les messages
              de contact sont conservés 12 mois.
            </p>
          </Section>
          <Section title="Cookies">
            <p>
              Nous utilisons uniquement des cookies techniques nécessaires au fonctionnement du site (panier, session, protection
              contre les attaques CSRF) et une mesure d’audience interne sans cookie publicitaire ni traceur tiers. Aucun cookie de
              réseau social ou publicitaire n’est déposé sans votre consentement.
            </p>
          </Section>
          <Section title="Vos droits">
            <p>
              Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos
              données. Exercez ces droits depuis votre espace client ou en écrivant à {store.email}. Vous pouvez également introduire
              une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </Section>
          <Section title="Sécurité">
            <p>
              Les échanges sont chiffrés (HTTPS). Les mots de passe sont stockés sous forme de hachage bcrypt. Les paiements sont traités
              par un prestataire certifié. L’accès aux données est strictement limité aux personnes habilitées.
            </p>
          </Section>
        </>
      ),
    },
  };

  const pageData = pages[page];

  if (!pageData) {
    return (
      <div className="container-page py-16 text-center">
        <p>Page introuvable.</p>
      </div>
    );
  }

  return (
    <>
      <Seo title={`${pageData.title} | EdyEco`} description={pageData.description} />
      <PageHero title={pageData.title} description={pageData.description} breadcrumbs={[{ label: pageData.title }]} compact />
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-3 text-xs text-forest-900">
            <ShieldCheck className="h-4 w-4" /> Dernière mise à jour : {LAST_UPDATE}. Ce document est fourni à titre informatif et doit être adapté à votre situation juridique avant publication.
          </div>
          <div className="space-y-8 rounded-3xl border border-forest-900/8 bg-white p-6 sm:p-10">
            {pageData.sections}
          </div>
        </div>
      </section>
    </>
  );
}
