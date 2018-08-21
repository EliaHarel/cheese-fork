#!/bin/bash

function fetch_semester {
	local semester=$1
	echo Fetching semester $semester...

	local courses_file=courses_$semester

	cd technion-ug-info-fetcher
	php courses_to_json.php courses_list_from_rishum=$semester || {
		cd ..
		echo courses_to_json failed
		return 1
	}
	cd ..

	local src_file=technion-ug-info-fetcher/$courses_file.json
	local dest_file_min=deploy/$courses_file.min.js
	local dest_file=deploy/$courses_file.js

	echo -n 'var courses_from_rishum = ' > $dest_file_min
	cat $src_file >> $dest_file_min

	echo -n 'var courses_from_rishum = ' > $dest_file
	local php_cmd="echo json_encode(json_decode(file_get_contents('$src_file')), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);"
	php -r "$php_cmd" >> $dest_file

	return 0
}

fetch_semester 201702 || exit 1
fetch_semester 201703 || exit 1
fetch_semester 201801 || exit 1