// src/app/wander/page.js
// Wander is now the home page (/).
import { redirect } from 'next/navigation';

export default function WanderRedirect() {
  redirect('/');
}
