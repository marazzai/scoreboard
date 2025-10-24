# Componenti UI - Guida Completa

Questa libreria di componenti UI è costruita seguendo il design system Apple-inspired con supporto completo per temi chiari e scuri.

## 🧩 Componenti Disponibili

### Button

Componente bottone riutilizzabile con tre varianti e tre dimensioni.

```tsx
import { Button } from '../components/ui';

<Button variant="primary" size="md">
  Click me
</Button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'tertiary'` (default: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `children`: React.ReactNode
- `className`: string (opzionale)
- Tutte le props standard di HTMLButtonElement

**Esempi:**
```tsx
<Button variant="primary" size="lg">Primary Large</Button>
<Button variant="secondary">Secondary Medium</Button>
<Button variant="tertiary" size="sm">Tertiary Small</Button>
<Button disabled>Disabled Button</Button>
```

---

### Card e Sotto-componenti

Sistema di card modulare per contenuti strutturati.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Card Props:**
- `variant`: `'default' | 'elevated' | 'outlined'` (default: `'default'`)
- `padding`: `'none' | 'sm' | 'md' | 'lg'` (default: `'md'`)

**Sotto-componenti:**
- `CardHeader`: Per titolo e descrizione
- `CardTitle`: Titolo principale
- `CardDescription`: Descrizione secondaria
- `CardContent`: Contenuto principale
- `CardFooter`: Footer con azioni

---

### Input

Campo di input con label, helper text e gestione errori.

```tsx
import { Input } from '../components/ui';

<Input 
  label="Email"
  type="email"
  placeholder="you@example.com"
  variant="filled"
  helper="We'll never share your email"
/>
```

**Props:**
- `variant`: `'default' | 'filled' | 'outlined'` (default: `'default'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `error`: boolean (default: `false`)
- `label`: string (opzionale)
- `helper`: string (opzionale)
- Tutte le props standard di HTMLInputElement (eccetto `size`)

**Esempi:**
```tsx
<Input label="Name" placeholder="Enter your name" />
<Input variant="filled" label="Email" type="email" />
<Input variant="outlined" error helper="This field is required" />
```

---

### ToggleSwitch

Interruttore personalizzato con animazioni fluide.

```tsx
import { ToggleSwitch } from '../components/ui';

const [enabled, setEnabled] = useState(false);

<ToggleSwitch
  label="Enable notifications"
  checked={enabled}
  onChange={setEnabled}
  size="md"
/>
```

**Props:**
- `checked`: boolean (default: `false`)
- `onChange`: (checked: boolean) => void
- `disabled`: boolean (default: `false`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `label`: string (opzionale)
- `id`: string (opzionale)

---

### Badge

Etichette per stato, categorie o notifiche.

```tsx
import { Badge } from '../components/ui';

<Badge variant="primary">New</Badge>
<Badge variant="success" size="sm">Updated</Badge>
```

**Props:**
- `variant`: `'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'` (default: `'default'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)

**Esempi:**
```tsx
<Badge variant="primary">New Feature</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>
```

---

### Modal

Dialog modale con backdrop e gestione tastiera.

```tsx
import { Modal } from '../components/ui';

const [isOpen, setIsOpen] = useState(false);

<Modal 
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to continue?</p>
  <div className="flex gap-3 mt-4">
    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </div>
</Modal>
```

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string (opzionale)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default: `'md'`)

**Features:**
- Chiusura con ESC
- Chiusura cliccando fuori
- Blocca lo scroll del body
- Animazioni smooth

---

### ThemeToggle

Componente per cambiare tema con persistenza.

```tsx
import { ThemeToggle } from '../components/ui';

<ThemeToggle />
```

**Features:**
- Salva preferenza in localStorage
- Rileva preferenza sistema
- Animazioni fluide
- Aggiorna automaticamente il tema

---

## 🎨 Utilizzo con il Design System

### Combinazioni Consigliate

```tsx
// Card con form
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your preferences</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <Input label="Username" placeholder="Enter username" />
      <ToggleSwitch label="Enable notifications" />
    </div>
  </CardContent>
  <CardFooter>
    <Button variant="primary">Save Changes</Button>
    <Button variant="secondary">Cancel</Button>
  </CardFooter>
</Card>

// Lista con badge
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Tasks</CardTitle>
      <Badge variant="primary">3 Active</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2">
        <span>Task 1</span>
        <Badge variant="success">Done</Badge>
      </div>
    </div>
  </CardContent>
</Card>
```

### Personalizzazione

Tutti i componenti accettano una prop `className` per personalizzazioni:

```tsx
<Button className="w-full justify-start" variant="secondary">
  Custom Button
</Button>

<Card className="hover:scale-105 transition-transform">
  Interactive Card
</Card>
```

---

## 🛠️ Best Practices

1. **Consistenza**: Usa sempre gli stessi size e variant per elementi simili
2. **Accessibilità**: Tutti i componenti includono attributi ARIA appropriati
3. **Performance**: Usa React.forwardRef per ref forwarding
4. **TypeScript**: Props completamente tipizzate per migliore DX
5. **Responsive**: Componenti progettati per essere responsive
6. **Theme-aware**: Tutti i componenti supportano automaticamente i temi

---

## 📦 Importazione

```tsx
// Importazione singola
import { Button } from '../components/ui';

// Importazione multipla
import { 
  Button, 
  Card, 
  CardHeader, 
  Input, 
  Modal 
} from '../components/ui';

// Importazione completa
import * as UI from '../components/ui';
```