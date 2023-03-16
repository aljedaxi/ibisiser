run:
	PORT=8011 npm run start

clean:
	rm -rdf owl-ibis

regen-ibis-spec: clean
	git clone git@github.com:doriantaylor/owl-ibis.git
	cd owl-ibis && make variants
	cp owl-ibis/ibis.ttl ./public/

build: regen-ibis-spec
	npm run build

upload: build
	cd build && npx surge
