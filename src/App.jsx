import React, { useMemo, useRef, useState } from 'react';

const initialClasses = [
  {
    id: 'class-user',
    name: 'User',
    attributes: ['id: int', 'name: String', 'email: String'],
    methods: ['getName(): String', 'updateProfile(): void'],
    x: 90,
    y: 145,
  },
  {
    id: 'class-order',
    name: 'Order',
    attributes: ['orderId: int', 'createdAt: Date', 'status: String'],
    methods: ['calculateTotal(): double', 'submit(): void'],
    x: 465,
    y: 95,
  },
  {
    id: 'class-product',
    name: 'Product',
    attributes: ['sku: String', 'price: double'],
    methods: ['getPrice(): double', 'isAvailable(): boolean'],
    x: 465,
    y: 400,
  },
];

const initialRelationships = [
  { id: 'rel-user-order', sourceId: 'class-user', targetId: 'class-order', type: 'association', label: 'places' },
  { id: 'rel-order-product', sourceId: 'class-order', targetId: 'class-product', type: 'association', label: 'contains' },
];

const classWidth = 238;
const classHeaderHeight = 46;
const rowHeight = 29;
const canvasWidth = 1200;
const canvasHeight = 780;
const javaKeywords = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue',
  'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if',
  'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private',
  'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null', 'var', 'record',
  'sealed', 'permits', 'yield',
]);

function classHeight(item) {
  return classHeaderHeight + Math.max(item.attributes.length, 1) * rowHeight + Math.max(item.methods.length, 1) * rowHeight + 10;
}

function identifier(value, fallback = 'GeneratedClass') {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_$]/g, ' ').split(/\s+/).filter(Boolean);
  const joined = cleaned.map((part, index) => index === 0
    ? part.charAt(0).toUpperCase() + part.slice(1)
    : part.charAt(0).toUpperCase() + part.slice(1)).join('');
  let safe = /^[a-zA-Z_$]/.test(joined) ? joined : `_${joined}`;
  if (javaKeywords.has(safe)) safe = `_${safe}`;
  return safe || fallback;
}

function javaType(type) {
  const value = (type || 'String').trim();
  const aliases = { int: 'int', integer: 'int', float: 'float', double: 'double', long: 'long', short: 'short', byte: 'byte', boolean: 'boolean', bool: 'boolean', char: 'char', string: 'String', date: 'java.util.Date', void: 'void' };
  return aliases[value.toLowerCase()] || identifier(value, 'String');
}

function parseTypedDeclaration(text, fallbackName, fallbackType = 'String') {
  const [rawName, rawType] = text.split(':').map((part) => part.trim());
  return { name: identifier(rawName || fallbackName).replace(/^./, (letter) => letter.toLowerCase()), type: javaType(rawType || fallbackType) };
}

function defaultReturn(type) {
  if (type === 'void') return '';
  if (type === 'boolean') return '        return false;';
  if (['int', 'float', 'double', 'long', 'short', 'byte', 'char'].includes(type)) return '        return 0;';
  return '        return null;';
}

function generateJava(classes, relationships) {
  const names = new Map();
  const usedNames = new Set();
  classes.forEach((item) => {
    const base = identifier(item.name);
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) name = `${base}${suffix++}`;
    usedNames.add(name);
    names.set(item.id, name);
  });

  return classes.map((item) => {
    const className = names.get(item.id);
    const inheritance = relationships.find((relation) => relation.type === 'inheritance' && relation.sourceId === item.id && relation.targetId !== item.id);
    const parent = inheritance ? ` extends ${names.get(inheritance.targetId)}` : '';
    const fields = item.attributes.map((attribute, index) => {
      const parsed = parseTypedDeclaration(attribute, `field${index + 1}`);
      return `    private ${parsed.type} ${parsed.name};`;
    });
    const methods = item.methods.map((method, index) => {
      const match = method.match(/^([^:(]+)\s*\((.*?)\)\s*(?::\s*(.+))?$/);
      if (!match) {
        const parsed = parseTypedDeclaration(method, `method${index + 1}`, 'void');
        return `    public ${parsed.type} ${parsed.name}() {\n${defaultReturn(parsed.type)}\n    }`;
      }
      const methodName = identifier(match[1], `method${index + 1}`).replace(/^./, (letter) => letter.toLowerCase());
      const returnType = javaType(match[3] || 'void');
      const parameters = match[2].trim()
        ? match[2].split(',').map((parameter, parameterIndex) => {
          const parsed = parseTypedDeclaration(parameter, `arg${parameterIndex + 1}`);
          return `${parsed.type} ${parsed.name}`;
        }).join(', ')
        : '';
      return `    public ${returnType} ${methodName}(${parameters}) {\n${defaultReturn(returnType)}\n    }`;
    });
    const links = relationships
      .filter((relation) => relation.sourceId === item.id && relation.type !== 'inheritance')
      .map((relation) => {
        const target = names.get(relation.targetId);
        if (relation.type === 'dependency') return `    // depends on ${target}`;
        return `    private ${target} ${target.charAt(0).toLowerCase()}${target.slice(1)};`;
      });
    const body = [...fields, ...links, ...methods].join('\n\n');
    return `class ${className}${parent} {\n${body || '    // Add attributes or methods in the diagram editor.'}\n}`;
  }).join('\n\n');
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.14 1.14" /><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.14-1.14" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" /></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

function RelationshipPath({ relationship, source, target, selected, onSelect }) {
  if (!source || !target) return null;
  const sx = source.x + classWidth / 2;
  const sy = source.y + classHeight(source) / 2;
  const tx = target.x + classWidth / 2;
  const ty = target.y + classHeight(target) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / length;
  const uy = dy / length;
  const sourceRadius = Math.min(classWidth / 2 / Math.max(Math.abs(ux), 0.001), classHeight(source) / 2 / Math.max(Math.abs(uy), 0.001));
  const targetRadius = Math.min(classWidth / 2 / Math.max(Math.abs(ux), 0.001), classHeight(target) / 2 / Math.max(Math.abs(uy), 0.001));
  const startX = sx + ux * sourceRadius;
  const startY = sy + uy * sourceRadius;
  const endX = tx - ux * targetRadius;
  const endY = ty - uy * targetRadius;
  const marker = relationship.type === 'inheritance' ? 'url(#inheritance-arrow)' : relationship.type === 'dependency' ? 'url(#dependency-arrow)' : undefined;
  return (
    <g className={`relationship ${selected ? 'relationship-selected' : ''}`} onClick={(event) => { event.stopPropagation(); onSelect(relationship.id); }}>
      <line className="relationship-hitbox" x1={startX} y1={startY} x2={endX} y2={endY} />
      <line className="relationship-line" x1={startX} y1={startY} x2={endX} y2={endY} markerEnd={marker} strokeDasharray={relationship.type === 'dependency' ? '7 6' : undefined} />
      {relationship.label && <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2})`}>
        <rect x="-45" y="-13" width="90" height="24" rx="7" />
        <text textAnchor="middle" dominantBaseline="central">{relationship.label}</text>
      </g>}
    </g>
  );
}

function ClassCard({ item, selected, onSelect, onPointerDown }) {
  const attrStart = classHeaderHeight;
  const methodStart = attrStart + Math.max(item.attributes.length, 1) * rowHeight;
  const height = classHeight(item);
  return (
    <g
      className={`class-card ${selected ? 'class-card-selected' : ''}`}
      transform={`translate(${item.x}, ${item.y})`}
      onPointerDown={(event) => onPointerDown(event, item.id)}
      onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
      role="button"
      tabIndex="0"
      aria-label={`Select ${item.name} class. Drag to move.`}
    >
      <rect className="card-shadow" x="2" y="4" width={classWidth} height={height} rx="13" />
      <rect className="card-body" width={classWidth} height={height} rx="13" />
      <path className="card-header" d={`M13 0h${classWidth - 26}a13 13 0 0 1 13 13v${classHeaderHeight - 13}H0V13A13 13 0 0 1 13 0Z`} />
      <text className="uml-stereotype" x={classWidth / 2} y="14" textAnchor="middle">&lt;&lt;class&gt;&gt;</text>
      <text className="class-name" x={classWidth / 2} y="34" textAnchor="middle">{item.name || 'Untitled'}</text>
      <line className="card-divider" x1="0" y1={attrStart} x2={classWidth} y2={attrStart} />
      {(item.attributes.length ? item.attributes : ['+ add attribute']).map((attribute, index) => (
        <text className={`member-text ${item.attributes.length ? '' : 'member-placeholder'}`} key={`attribute-${index}`} x="14" y={attrStart + 19 + index * rowHeight}>− {attribute}</text>
      ))}
      <line className="card-divider" x1="0" y1={methodStart} x2={classWidth} y2={methodStart} />
      {(item.methods.length ? item.methods : ['+ add method']).map((method, index) => (
        <text className={`member-text ${item.methods.length ? '' : 'member-placeholder'}`} key={`method-${index}`} x="14" y={methodStart + 19 + index * rowHeight}>+ {method}</text>
      ))}
    </g>
  );
}

function App() {
  const [classes, setClasses] = useState(initialClasses);
  const [relationships, setRelationships] = useState(initialRelationships);
  const [selectedId, setSelectedId] = useState('class-user');
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [activePanel, setActivePanel] = useState('class');
  const [relationshipDraft, setRelationshipDraft] = useState({ sourceId: 'class-user', targetId: 'class-order', type: 'association', label: '' });
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);
  const selectedClass = classes.find((item) => item.id === selectedId);
  const generatedCode = useMemo(() => generateJava(classes, relationships), [classes, relationships]);

  function updateClass(id, updates) {
    setClasses((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function updateListValue(field, index, value) {
    if (!selectedClass) return;
    updateClass(selectedClass.id, { [field]: selectedClass[field].map((item, itemIndex) => itemIndex === index ? value : item) });
  }

  function addListItem(field) {
    if (!selectedClass) return;
    const value = field === 'attributes' ? 'newField: String' : 'newMethod(): void';
    updateClass(selectedClass.id, { [field]: [...selectedClass[field], value] });
  }

  function removeListItem(field, index) {
    if (!selectedClass) return;
    updateClass(selectedClass.id, { [field]: selectedClass[field].filter((_, itemIndex) => itemIndex !== index) });
  }

  function addClass() {
    const id = `class-${Date.now()}`;
    const offset = (classes.length % 4) * 35;
    const item = { id, name: 'NewClass', attributes: ['id: int'], methods: ['doSomething(): void'], x: 140 + offset, y: 190 + offset };
    setClasses((current) => [...current, item]);
    setSelectedId(id);
    setSelectedRelationshipId(null);
    setActivePanel('class');
    setNotice('Class added — give it a name and define its members.');
  }

  function deleteClass(id) {
    setClasses((current) => current.filter((item) => item.id !== id));
    setRelationships((current) => current.filter((relation) => relation.sourceId !== id && relation.targetId !== id));
    setSelectedId((current) => current === id ? classes.find((item) => item.id !== id)?.id || null : current);
    const remainingClass = classes.find((item) => item.id !== id);
    if (relationshipDraft.sourceId === id || relationshipDraft.targetId === id) {
      setRelationshipDraft((draft) => ({
        ...draft,
        sourceId: draft.sourceId === id ? remainingClass?.id || '' : draft.sourceId,
        targetId: draft.targetId === id ? classes.find((item) => item.id !== id && item.id !== remainingClass?.id)?.id || '' : draft.targetId,
      }));
    }
    setNotice('Class and its relationships removed.');
  }

  function createRelationship(event) {
    event.preventDefault();
    if (!relationshipDraft.sourceId || !relationshipDraft.targetId || relationshipDraft.sourceId === relationshipDraft.targetId) {
      setNotice('Choose two different classes to connect.');
      return;
    }
    const id = `rel-${Date.now()}`;
    setRelationships((current) => [...current, { ...relationshipDraft, id }]);
    setSelectedRelationshipId(id);
    setSelectedId(null);
    setActivePanel('relationship');
    setNotice('Relationship added to the diagram.');
  }

  function deleteRelationship(id) {
    setRelationships((current) => current.filter((relation) => relation.id !== id));
    setSelectedRelationshipId(null);
    setActivePanel('class');
    setNotice('Relationship removed.');
  }

  function startDrag(event, id) {
    if (event.button !== 0 || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const item = classes.find((classItem) => classItem.id === id);
    setDragging({ id, offsetX: (event.clientX - rect.left) * scaleX - item.x, offsetY: (event.clientY - rect.top) * scaleY - item.y });
    setSelectedId(id);
    setSelectedRelationshipId(null);
    setActivePanel('class');
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const maxY = canvasHeight - classHeight(classes.find((item) => item.id === dragging.id)) - 20;
    updateClass(dragging.id, {
      x: Math.max(20, Math.min(canvasWidth - classWidth - 20, (event.clientX - rect.left) * scaleX - dragging.offsetX)),
      y: Math.max(20, Math.min(maxY, (event.clientY - rect.top) * scaleY - dragging.offsetY)),
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setNotice(`Couldn't copy code: ${error.message}`);
    }
  }

  function downloadCode() {
    const blob = new Blob([generatedCode], { type: 'text/x-java;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Diagram.java';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Diagram.java downloaded.');
  }

  function selectRelationship(id) {
    setSelectedRelationshipId(id);
    setSelectedId(null);
    setActivePanel('relationship');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Classcraft home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-copy"><strong>classcraft</strong><small>UML STUDIO</small></span>
        </a>
        <div className="assignment"><span className="assignment-dot" /> Assignment <span className="assignment-divider">/</span> <strong>Nikhil Nikalje</strong></div>
        <div className="topbar-right">
          <span className="saved-status"><span /> Session draft</span>
          <button className="avatar" title="Nikhil Nikalje">NN</button>
        </div>
      </header>

      <section className="workspace">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> OBJECT-ORIENTED DESIGN</div>
            <h1>Class diagram <span className="draft-badge">DRAFT</span></h1>
            <p>Design your classes, map their relationships, and generate Java code.</p>
          </div>
          <button className="primary-button generate-button" onClick={() => setActivePanel('java')}><Icon name="code" /> <span>Generate Java</span></button>
        </div>

        <div className="toolbar">
          <div className="tool-group">
            <button className="tool-button add-class-button" onClick={addClass}><Icon name="plus" /> Add class</button>
            <span className="toolbar-separator" />
            <button className={`tool-button ${activePanel === 'relationship' ? 'tool-active' : ''}`} onClick={() => { setActivePanel('relationship'); setSelectedId(null); setSelectedRelationshipId(null); }}><Icon name="link" /> Add relationship</button>
          </div>
          <div className="diagram-count"><span>{classes.length}</span> classes <i /> <span>{relationships.length}</span> relationships</div>
        </div>

        <div className="content-grid">
          <section className="canvas-panel" aria-label="UML class diagram canvas">
            <div className="canvas-toolbar">
              <span><span className="canvas-live-dot" /> DIAGRAM CANVAS</span>
              <span className="canvas-hint">Drag classes to arrange <span className="hint-key">↖</span></span>
            </div>
            <div className="canvas-scroll">
              <svg
                ref={svgRef}
                className="diagram-svg"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                onPointerMove={moveDrag}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onClick={() => { setSelectedId(null); setSelectedRelationshipId(null); }}
                aria-label="UML diagram with draggable class cards"
              >
                <defs>
                  <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#dce3ee" />
                  </pattern>
                  <marker id="inheritance-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
                    <path d="M1 1 10 6 1 11Z" fill="#fff" stroke="#667995" strokeWidth="1.3" />
                  </marker>
                  <marker id="dependency-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto">
                    <path d="M1 1 10 6 1 11" fill="none" stroke="#667995" strokeWidth="1.5" />
                  </marker>
                </defs>
                <rect width={canvasWidth} height={canvasHeight} fill="url(#dot-grid)" />
                {relationships.map((relation) => (
                  <RelationshipPath
                    key={relation.id}
                    relationship={relation}
                    source={classes.find((item) => item.id === relation.sourceId)}
                    target={classes.find((item) => item.id === relation.targetId)}
                    selected={selectedRelationshipId === relation.id}
                    onSelect={selectRelationship}
                  />
                ))}
                {classes.map((item) => (
                  <ClassCard key={item.id} item={item} selected={selectedId === item.id} onSelect={setSelectedId} onPointerDown={startDrag} />
                ))}
                {classes.length === 0 && <text x="600" y="360" textAnchor="middle" className="empty-canvas">Add a class to start your diagram</text>}
              </svg>
            </div>
            <div className="canvas-footer">
              <div className="legend">
                <span><i className="legend-line" /> Association</span>
                <span><i className="legend-line inheritance-legend" /> Inheritance</span>
                <span><i className="legend-line dependency-legend" /> Dependency</span>
              </div>
              <span className="canvas-coordinate">1200 × 780 <i /> <span className="zoom-label">100%</span></span>
            </div>
          </section>

          <aside className="inspector">
            <div className="inspector-head">
              <div><span className="inspector-kicker">PROPERTIES</span><h2>Inspector</h2></div>
              <span className="inspector-menu">•••</span>
            </div>
            <div className="inspector-tabs">
              <button className={activePanel === 'class' ? 'active-tab' : ''} onClick={() => setActivePanel('class')}>Class</button>
              <button className={activePanel === 'relationship' ? 'active-tab' : ''} onClick={() => setActivePanel('relationship')}>Relationship</button>
              <button className={activePanel === 'java' ? 'active-tab' : ''} onClick={() => setActivePanel('java')}>Java</button>
            </div>

            {activePanel === 'class' && (
              selectedClass ? (
                <div className="inspector-content">
                  <div className="selected-type"><span className="mini-class-icon">C</span><div><strong>UML Class</strong><small>CLASS ELEMENT</small></div><button className="icon-button danger-hover" aria-label="Delete class" title="Delete class" onClick={() => deleteClass(selectedClass.id)}><Icon name="trash" size={16} /></button></div>
                  <label className="field-label" htmlFor="class-name">Class name</label>
                  <input id="class-name" className="text-input class-name-input" value={selectedClass.name} onChange={(event) => updateClass(selectedClass.id, { name: event.target.value })} placeholder="ClassName" />
                  <div className="section-title"><span>ATTRIBUTES</span><button className="mini-add" onClick={() => addListItem('attributes')} aria-label="Add attribute"><Icon name="plus" size={15} /></button></div>
                  <div className="member-list">
                    {selectedClass.attributes.map((attribute, index) => (
                      <div className="member-row" key={`attr-${index}`}><span className="member-prefix">−</span><input aria-label={`Attribute ${index + 1}`} value={attribute} onChange={(event) => updateListValue('attributes', index, event.target.value)} /><button className="remove-member" aria-label={`Remove attribute ${index + 1}`} onClick={() => removeListItem('attributes', index)}><Icon name="close" size={14} /></button></div>
                    ))}
                    {!selectedClass.attributes.length && <p className="empty-members">No attributes yet.</p>}
                  </div>
                  <div className="section-title method-heading"><span>METHODS</span><button className="mini-add" onClick={() => addListItem('methods')} aria-label="Add method"><Icon name="plus" size={15} /></button></div>
                  <div className="member-list">
                    {selectedClass.methods.map((method, index) => (
                      <div className="member-row" key={`method-${index}`}><span className="member-prefix method-prefix">+</span><input aria-label={`Method ${index + 1}`} value={method} onChange={(event) => updateListValue('methods', index, event.target.value)} /><button className="remove-member" aria-label={`Remove method ${index + 1}`} onClick={() => removeListItem('methods', index)}><Icon name="close" size={14} /></button></div>
                    ))}
                    {!selectedClass.methods.length && <p className="empty-members">No methods yet.</p>}
                  </div>
                  <div className="field-help">Use <code>name: Type</code> for attributes and <code>method(arg: Type): ReturnType</code> for methods.</div>
                  <button className="delete-button" onClick={() => deleteClass(selectedClass.id)}><Icon name="trash" size={15} /> Delete class</button>
                </div>
              ) : (
                <div className="empty-inspector"><span className="empty-inspector-icon">↖</span><strong>Select a class</strong><p>Choose a class on the canvas to edit its name, attributes, and methods.</p><button className="subtle-button" onClick={addClass}><Icon name="plus" size={15} /> Add a class</button></div>
              )
            )}

            {activePanel === 'relationship' && (
              <div className="inspector-content relation-content">
                <div className="relation-intro"><span className="relation-intro-icon"><Icon name="link" /></span><div><strong>Connect your classes</strong><p>Choose two classes and define how they relate.</p></div></div>
                <form onSubmit={createRelationship}>
                  <label className="field-label" htmlFor="relationship-type">Relationship type</label>
                  <select id="relationship-type" className="text-input select-input" value={relationshipDraft.type} onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, type: event.target.value }))}>
                    <option value="association">Association</option><option value="inheritance">Inheritance</option><option value="dependency">Dependency</option>
                  </select>
                  <label className="field-label spaced-label" htmlFor="relationship-source">Source class</label>
                  <select id="relationship-source" className="text-input select-input" value={relationshipDraft.sourceId} onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, sourceId: event.target.value }))}>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name || 'Untitled'}</option>)}
                  </select>
                  <label className="field-label spaced-label" htmlFor="relationship-target">Target class</label>
                  <select id="relationship-target" className="text-input select-input" value={relationshipDraft.targetId} onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, targetId: event.target.value }))}>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name || 'Untitled'}</option>)}
                  </select>
                  <label className="field-label spaced-label" htmlFor="relationship-label">Label <span className="optional-label">OPTIONAL</span></label>
                  <input id="relationship-label" className="text-input" value={relationshipDraft.label} onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, label: event.target.value }))} placeholder="e.g. contains" />
                  <button className="primary-button relation-submit" type="submit" disabled={classes.length < 2}><Icon name="plus" size={16} /> Create relationship</button>
                </form>
                <div className="relationship-list-heading">EXISTING RELATIONSHIPS <span>{relationships.length}</span></div>
                {relationships.length ? <div className="relationship-list">{relationships.map((relation) => {
                  const source = classes.find((item) => item.id === relation.sourceId);
                  const target = classes.find((item) => item.id === relation.targetId);
                  return <button className={`relationship-list-item ${selectedRelationshipId === relation.id ? 'relation-row-active' : ''}`} key={relation.id} onClick={() => selectRelationship(relation.id)}>
                    <span className={`relation-type-dot ${relation.type}`} />
                    <span className="relation-list-copy"><strong>{source?.name || 'Class'} <i>→</i> {target?.name || 'Class'}</strong><small>{relation.type}{relation.label ? ` · ${relation.label}` : ''}</small></span>
                    <span className="relation-delete" onClick={(event) => { event.stopPropagation(); deleteRelationship(relation.id); }} role="button" aria-label="Delete relationship"><Icon name="close" size={14} /></span>
                  </button>;
                })}</div> : <p className="empty-members">No relationships yet.</p>}
              </div>
            )}

            {activePanel === 'java' && (
              <div className="inspector-content java-content">
                <div className="java-heading"><span className="java-icon">&lt;/&gt;</span><div><strong>Java source</strong><small>{classes.length} {classes.length === 1 ? 'class' : 'classes'} generated</small></div></div>
                <div className="code-toolbar"><span><i /> Diagram.java</span><button onClick={copyCode} title="Copy Java source"><Icon name="copy" size={15} /> {copied ? 'Copied!' : 'Copy'}</button></div>
                <pre className="code-block"><code>{generatedCode || '// Add classes to generate Java source.'}</code></pre>
                <button className="primary-button download-button" onClick={downloadCode} disabled={!classes.length}><Icon name="download" size={16} /> Download .java</button>
                <div className="java-note"><Icon name="spark" size={16} /><span>Generated from your class diagram. Changes update this preview instantly.</span></div>
              </div>
            )}
          </aside>
        </div>
        <div className="statusbar"><div><span className="status-check">✓</span> Ready to design <i /> UML 2.5</div><div>Made for object-oriented thinkers <span className="status-heart">♥</span></div></div>
        <div className={`toast ${notice ? 'toast-visible' : ''}`} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={14} /></button></div>
      </section>
    </main>
  );
}

export default App;
