module.exports = function(grunt) {

  'use strict';

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  var path = require('path');
  var config = {};

  grunt.initConfig(config);

  grunt.registerTask( 'docs', 'A new documentation generator.', function(src, dest){
    
    var path, fs, yaml, asyncDone, convertedSrc;
    path = require('path');
    fs = require('fs-extra');
    yaml = require('js-yaml');
    asyncDone = this.async();

    if ( argsAreValid(arguments, this.name) ) {
      convertedSrc = parseSrc( src );
      writeDest( dest, convertedSrc );
    }

    function writeDest( dest, convertedDocs ) {
      fs.writeFile( dest, JSON.stringify(convertedDocs, null, '\t'), function(err){
        if ( err ) {
          grunt.log.error( 'Error writing', dest+'.' );
          asyncDone( false );
        }
        grunt.log.ok( dest, ' was created.' );
        asyncDone();
      });
    }

    function parseSrc( src ) {
      var data, regex, docs, code, convertedDocs, ext;

      grunt.verbose.writeln( 'parseSrc(): Parsing', src );

      // Get the file extension for src so we know which regex to use.
      ext = getExt( src );
      regex = {
        html: {
          opening: /<!--\s*topdoc[^\n]*\n/,
          closing: /-->/,
          comment: /<!--\s*topdoc(?:[^-]|[\r\n]|-[^-])*-->/g
        },
        css: {
          opening: /\/\*\s*topdoc[^\n]*\n/,
          closing: /\*\//,
          comment: /\/\*\s*topdoc[^*]*\*+(?:[^/*][^*]*\*+)*\//g
        }
      };
      data = getData( src, regex[ ext ] );
      docs = parseOutDocs( data, regex[ ext ] );
      code = parseOutCode( data, regex[ ext ] );
      // Validate the parsing before
      if ( parsingIsValid(docs, code) ) {
        grunt.log.ok('Parsing was successful.');
        grunt.verbose.writeln( 'docs:\n', docs );
        grunt.verbose.writeln( 'code:\n', code );

        // Join the docs and code back together as structured objects.
        convertedDocs = joinDocsAndCode( docs, code );
      }
      return convertedDocs;
    }

    function joinDocsAndCode( docs, code ) {
      var convertedDocs, i;
      convertedDocs = [];
      i = 0;
      // Loop through each doc and:
      // 1. Convert the YAML into a structured object.
      // 2. Add the converted doc and the code to an object so they can be
      //    accessed together.
      // 3. Return all of the new objects.
      for ( i; i < docs.length; i++ ) {
        // Add the converted docs and the code to the same object.
        convertedDocs.push({
          docs: convertYaml( docs[i], i ),
          code: code[i]
        });

        grunt.verbose.writeln( 'convertedDocs['+i+']:\n', convertedDocs[i] );
      }
      return convertedDocs;
    }

    function convertYaml( yamlString, index ) {
      var convertedYaml;
      // Try converting the doc to YAML and warn if it fails.
      try {
        convertedYaml = yaml.safeLoad( yamlString );
      } catch ( e ) {
        grunt.log.error('Error converting comment #'+(index+1)+' to YAML. Please check for formatting errors.');
        asyncDone( false );
      }
      return convertedYaml;
    }

    function parsingIsValid( docs, code ) {
      // Check to see if the docs and code array lengths match.
      // If they don't then something went wrong as they should match
      // one for one.
      grunt.verbose.writeln( '\tdocs.length:', docs.length );
      grunt.verbose.writeln( '\tcode.length:', code.length );
      if ( docs.length !== code.length ) {
        grunt.log.error('Parsing failed because the parsed docs did not match the parsed code.');
        asyncDone( false );
        return false;
      } else {
        return true;
      }
    }

    function getData( src, regex ) {
      var data;
      // Read the src.
      data = fs.readFileSync( src, 'utf-8' );
      // Trim everything before the first regex because it's not associated with
      // any comment.
      data = data.slice( data.search(regex.comment) );
      return data;
    }

    function parseOutDocs( data, regex ) {
      var docs;
      // "docs" are anything that matches the regex.
      docs = data.match( regex.comment );
      // Clean each item in the array.
      // NEEDS REFACTORING to fix the second thisArg argument.
      // It probably shouldn't be `regex`? Not sure.
      docs.forEach( scrubDocComments, regex );
      return docs;
    }

    function scrubDocComments( element, index, array ) {
      // Remove the opening and closing comments.
      array[ index ] = array[ index ].replace( this.opening, '' );
      array[ index ] = array[ index ].replace( this.closing, '' );
    }

    function parseOutCode( data, regex ) {
      var code;
      // The "code" is everything betwixt the regex.
      code = data.split( regex.comment );
      // Removes the first item in the array since it will always be empty.
      code.shift();
      // Clean each item in the array.
      code.forEach( trimArrayElement );
      return code;
    }

    function trimArrayElement( element, index, array ) {
      array[ index ] = array[ index ].trim();
    }

    function argsAreValid( args, name ) {
      // Check to see if we have the required arguments.
      if ( args.length === 2 ) {
        return true;
      } else {
        grunt.log.error('Please provide a file as the first argument and a destination as the second.');
        asyncDone( false );
        return false;
      }
    }

    function getExt( src ) {
      var ext;
      ext = path.extname( src ).substring(1);
      switch ( ext ) {
        case 'css':
        case 'less':
          ext = 'css';
          break;
        case 'html':
          ext = 'html';
          break;
        default:
          ext = 'css';
      }
      return ext;
    }

  });

};
