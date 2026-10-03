FROM eclipse-temurin:21-jdk

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# Executor runs: javac Solution.java
# Candidate code must define `public class Solution` with a `main` method —
# documented to candidates in the coding editor's instructions panel.
