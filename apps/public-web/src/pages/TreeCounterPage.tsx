import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../lib/api';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function TreeCounterPage() {
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    api.getTreeCounter().then((res) => {
      if (res.success) setTreeData(res.data);
      setLoading(false);
    });

    api.getRaceStatus().then((res) => {
      const eventId = res?.data?.event?.id;
      if (!eventId) return;

      const socket = io(API_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:event', eventId);
        setLive(true);
      });

      socket.on('trees:update', (data: { totalTrees: number; totalKm: number; totalCO2: number }) => {
        setTreeData(data);
      });

      socket.on('disconnect', () => setLive(false));
    }).catch(() => {});

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <a href="/" className="hero-body inline-flex items-center gap-1 text-sm text-brand-navy/60 hover:text-brand-navy transition mb-8">
          &larr; Back to Home
        </a>

        <div className="flex items-center gap-3 mb-4">
          <h1 className="hero-title text-4xl font-bold text-brand-navy">Green Mission</h1>
          {live && (
            <span className="hero-body inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="hero-body text-brand-navy/60 mb-12">
          Every 3 kilometers run during the ISA Tech Marathon plants a tree.
          Together, we're making a real impact on the environment.
        </p>

        {loading ? (
          <div className="hero-body text-center text-brand-navy/50 py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm text-center">
              <p className="hero-title text-6xl font-bold text-emerald-600 mb-2">{treeData?.totalTrees || 0}</p>
              <p className="hero-body text-brand-navy/70">Trees Planted</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm text-center">
              <p className="hero-title text-6xl font-bold text-emerald-600 mb-2">{treeData?.totalKm?.toFixed(0) || 0}</p>
              <p className="hero-body text-brand-navy/70">Kilometers Run</p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm text-center">
              <p className="hero-title text-6xl font-bold text-emerald-600 mb-2">{treeData?.totalCO2?.toFixed(0) || 0}</p>
              <p className="hero-body text-brand-navy/70">kg CO2 Offset</p>
            </div>
          </div>
        )}

        <div className="mt-10 bg-white p-8 rounded-2xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-4">How It Works</h2>
          <div className="hero-body space-y-3 text-brand-navy/80">
            <p>For every 3 kilometers run by participants, our partners plant a tree in your name.</p>
            <p>The tree counter above updates live as runners make progress &mdash; not just at the finish line.</p>
            <p>After the marathon, you'll receive a certificate with the number of trees planted on your behalf.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
