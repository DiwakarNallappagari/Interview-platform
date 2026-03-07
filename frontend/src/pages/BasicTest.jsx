const BasicTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#333', marginBottom: '16px' }}>
          Basic Test Page
        </h1>
        <p style={{ color: '#666', marginBottom: '16px' }}>
          If you can see this page, React is working correctly.
        </p>
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <strong>Room ID Test:</strong> {window.location.pathname}
        </div>
        <button 
          onClick={() => alert('Button clicked!')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  )
}

export default BasicTest
