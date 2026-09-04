import { Routes, Route } from 'react-router-dom';
import LEDScreenDark from './LEDScreenDark';
import LEDScreenLight from './LEDScreenLight';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LEDScreenDark />} />
      <Route path="/light" element={<LEDScreenLight />} />
    </Routes>
  );
}
