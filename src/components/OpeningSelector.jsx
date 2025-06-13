// src/components/OpeningSelector.jsx
const OpeningSelector = ({ openings, onSelectVariation, userSystem }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [userProgress, setUserProgress] = useState({});

  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    const progress = await userSystem.getAllOpeningProgress();
    setUserProgress(progress);
  };

  const getProgressPercentage = (variationId) => {
    const progress = userProgress[variationId];
    if (!progress) return 0;
    
    return Math.round(
      (progress.current_move_depth / progress.max_move_depth) * 100
    );
  };

  const filteredOpenings = openings.filter(opening => {
    if (selectedCategory !== 'all' && opening.category !== selectedCategory) {
      return false;
    }
    if (selectedDifficulty !== 'all' && opening.difficulty !== selectedDifficulty) {
      return false;
    }
    return true;
  });

  return (
    <div className="opening-selector">
      <div className="filters">
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="Open">Open Games</option>
          <option value="Semi-Open">Semi-Open Games</option>
          <option value="Closed">Closed Games</option>
        </select>
        
        <select 
          value={selectedDifficulty} 
          onChange={(e) => setSelectedDifficulty(e.target.value)}
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="openings-grid">
        {filteredOpenings.map(opening => (
          <div key={opening.id} className="opening-card">
            <h3>{opening.name}</h3>
            <p className="eco-code">{opening.eco_code}</p>
            <p className="description">{opening.description}</p>
            
            <div className="variations">
              {opening.variations.map(variation => (
                <div key={variation.id} className="variation-item">
                  <div className="variation-header">
                    <h4>{variation.variation_name}</h4>
                    <div className="progress-indicator">
                      {getProgressPercentage(variation.id)}%
                    </div>
                  </div>
                  
                  <div className="variation-details">
                    <p>Moves: {variation.move_count}</p>
                    <p>Difficulty: {opening.difficulty}</p>
                  </div>
                  
                  <button 
                    onClick={() => onSelectVariation(opening, variation)}
                    className="start-practice-btn"
                  >
                    {getProgressPercentage(variation.id) > 0 ? 'Continue' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
