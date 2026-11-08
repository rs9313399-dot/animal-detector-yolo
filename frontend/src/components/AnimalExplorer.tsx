import React, { useState } from 'react';
import { 
  Compass, 
  Search, 
  Info, 
  Tag, 
  Layers, 
  Globe, 
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { AnimalReference } from '../types';
import { SUPPORTED_ANIMALS } from '../constants/animals';

interface AnimalExplorerProps {
  onSelectAnimal: (animal: AnimalReference) => void;
}

export const AnimalExplorer: React.FC<AnimalExplorerProps> = ({ onSelectAnimal }) => {
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Avian Wildlife', 'Carnivore', 'Domestic', 'Wild Megafauna', 'Wild Herbivore'];

  const filteredAnimals = SUPPORTED_ANIMALS.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.scientific.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'all' || 
      item.category.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="view-content">
      {/* Header */}
      <div className="editorial-hero">
        <span className="editorial-eyebrow">Taxonomic Field Guide &amp; COCO Reference</span>
        <h2 className="editorial-heading">
          Monitored Species <em>Taxonomy &amp; Dossiers</em>
        </h2>
        <p className="editorial-lead">
          Verified biological reference catalog for the 10 monitored COCO animal classes. 
          This section contains scientific reference material, distinctly separated from active field detections.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px', textTransform: 'capitalize' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Taxa' : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search species or binomial name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              padding: '6px 12px 6px 32px', 
              fontSize: '12px', 
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              width: '240px'
            }}
          />
        </div>
      </div>

      {/* Animals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '22px' }}>
        {filteredAnimals.map((animal) => (
          <div 
            key={animal.class_id}
            className="capture-card"
            onClick={() => onSelectAnimal(animal)}
            style={{ cursor: 'pointer' }}
          >
            {/* Photography Box */}
            <div className="capture-thumb-box" style={{ aspectRatio: '16 / 11' }}>
              <img 
                src={animal.imageUrl} 
                alt={animal.name} 
                className="capture-thumb"
                loading="lazy"
              />
              
              {/* Classification Tag */}
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  left: '10px', 
                  padding: '3px 8px', 
                  backgroundColor: 'rgba(10, 13, 16, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.04em'
                }}
              >
                CLASS {animal.class_id} • COCO
              </span>

              {/* IUCN Tag */}
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  padding: '3px 7px', 
                  backgroundColor: 'rgba(10, 13, 16, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${animal.hex}`,
                  borderRadius: 'var(--radius-xs)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: animal.hex
                }}
              >
                {animal.iucn.toUpperCase()}
              </span>
            </div>

            {/* Information Body */}
            <div className="capture-meta-box" style={{ gap: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: animal.hex }}></span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{animal.name}</h3>
                </div>
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {animal.scientific}
                </span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {animal.description}
              </p>

              <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {animal.category}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--accent-forest-light)', fontWeight: 500 }}>
                  <span>View Dossier</span>
                  <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

