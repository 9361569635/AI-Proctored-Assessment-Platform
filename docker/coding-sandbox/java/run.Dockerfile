FROM eclipse-temurin:21-jre

RUN apt-get update && apt-get install -y --no-install-recommends time \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# Executor runs: timeout 5 /usr/bin/time -v java -cp /sandbox Solution < input.txt
