clean:
	rm -rdf owl-ibis

regen-ibis-spec: clean
	git clone git@github.com:doriantaylor/owl-ibis.git
	cd owl-ibis && make variants
	cp owl-ibis/ibis.ttl ./public/
	gsed -i "42i `node backend/rdf.mjs`" public/index.html

run: regen-ibis-spec
	PORT=8011 npm run start

build: regen-ibis-spec
	npm run build

upload: build
	cd build && npx surge
