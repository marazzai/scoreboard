# Guida ai Colori Personalizzati

Questo progetto utilizza un sistema di colori personalizzato ispirato al design di Apple, con supporto completo per temi chiari e scuri.

## 🎨 Sistema di Colori

### Variabili CSS Disponibili

Le seguenti variabili CSS sono definite e cambiano automaticamente tra tema chiaro e scuro:

**Sfondi:**
- `--bg-primary`: Sfondo principale (#f5f5f7 chiaro / #000000 scuro)
- `--bg-secondary`: Sfondo secondario (#ffffff chiaro / #161617 scuro)
- `--bg-tertiary`: Sfondo terziario (#f0f0f2 chiaro / #2c2c2e scuro)

**Testi:**
- `--text-primary`: Testo principale (#1d1d1f chiaro / #f5f5f7 scuro)
- `--text-secondary`: Testo secondario (#6e6e73 chiaro / #86868b scuro)
- `--text-accent`: Testo accent (#0071e3 chiaro / #2997ff scuro)

**Altri:**
- `--border-color`: Colore dei bordi (rgba(0,0,0,0.1) chiaro / rgba(255,255,255,0.15) scuro)
- `--primary-button-bg`: Sfondo bottone primario
- `--primary-button-text`: Testo bottone primario
- `--secondary-button-bg`: Sfondo bottone secondario
- `--secondary-button-text`: Testo bottone secondario

## 🛠️ Utilizzo con Tailwind CSS

### Classi Tailwind Personalizzate

Grazie alla configurazione `@theme inline` in `globals.css`, puoi utilizzare questi colori direttamente nelle classi Tailwind:

```jsx
// Sfondi
<div className="bg-primary">Sfondo primario</div>
<div className="bg-secondary">Sfondo secondario</div>
<div className="bg-tertiary">Sfondo terziario</div>
<div className="bg-accent">Sfondo accent</div>

// Testi
<p className="text-text-primary">Testo primario</p>
<p className="text-text-secondary">Testo secondario</p>
<p className="text-accent">Testo accent</p>

// Bordi
<div className="border border-color">Con bordo personalizzato</div>

// Bottoni
<div className="bg-button-primary-bg text-button-primary-text">Bottone primario</div>
<div className="bg-button-secondary-bg text-button-secondary-text">Bottone secondario</div>
```

### Classi CSS Utility Predefinite

Per maggiore comodità, sono disponibili anche classi CSS utility:

```jsx
<div className="bg-primary text-primary">
  <div className="bg-secondary subtle-shadow">
    <button className="primary-button">Azione principale</button>
    <button className="secondary-button">Azione secondaria</button>
  </div>
</div>
```

## 🌙 Gestione del Tema

### Componente ThemeToggle

Il componente `ThemeToggle` fornisce un interruttore funzionale per cambiare tema:

```jsx
import ThemeToggle from '../components/ThemeToggle';

export default function MyPage() {
  return (
    <div>
      <ThemeToggle />
    </div>
  );
}
```

### Controllo Manuale del Tema

Per controllare il tema programmaticamente:

```javascript
// Attiva tema scuro
document.documentElement.classList.add('dark');
localStorage.setItem('theme', 'dark');

// Attiva tema chiaro
document.documentElement.classList.remove('dark');
localStorage.setItem('theme', 'light');
```

## 💡 Classi Utility Speciali

### Ombreggiatura Sottile
```jsx
<div className="subtle-shadow">Elemento con ombra sottile</div>
```

### Toggle Switch Personalizzati
```jsx
<div className="toggle-switch active">Toggle attivo</div>
<div className="toggle-switch">Toggle inattivo</div>
```

### Ring Accent per Focus
```jsx
<button className="ring-accent focus:ring-2">Bottone con focus personalizzato</button>
```

## 📝 Esempi Pratici

### Card con Tema
```jsx
<div className="bg-secondary p-6 rounded-xl subtle-shadow border border-color">
  <h3 className="text-text-primary font-semibold mb-2">Titolo Card</h3>
  <p className="text-text-secondary">Descrizione della card</p>
  <button className="primary-button mt-4 px-4 py-2 rounded-lg">
    Azione
  </button>
</div>
```

### Header Responsive
```jsx
<header className="bg-secondary border-b border-color">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex justify-between items-center h-16">
      <h1 className="text-xl font-semibold text-text-primary">Logo</h1>
      <nav className="space-x-4">
        <button className="primary-button px-4 py-2 rounded-lg">
          CTA
        </button>
      </nav>
    </div>
  </div>
</header>
```

## 🎯 Best Practices

1. **Usa sempre le variabili CSS** invece di colori hardcoded per garantire compatibilità con i temi
2. **Testa sempre entrambi i temi** (chiaro e scuro) durante lo sviluppo
3. **Utilizza `subtle-shadow`** per le card invece di ombre standard
4. **Combina le classi utility** per effetti complessi (es. `ring-accent focus:ring-2`)
5. **Mantieni la consistenza** utilizzando sempre la stessa palette di colori