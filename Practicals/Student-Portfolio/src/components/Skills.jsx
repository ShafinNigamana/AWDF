function Skills({ skillList }) {
  return (
    <section>
      <div className="center">
        <h2>Skills</h2>
      </div>

      <ul>
        {skillList.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </section>
  );
}

export default Skills;