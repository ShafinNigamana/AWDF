function Skills({ skillList }) {
  return (
    <section className="skills-section">
      <h2>Skills</h2>
      <div className="skills-badges">
        {skillList.map((skill) => (
          <span key={skill} className="skill-badge">{skill}</span>
        ))}
      </div>
    </section>
  );
}

export default Skills;